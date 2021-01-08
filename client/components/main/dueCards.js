BlazeComponent.extendComponent({
  dueCardsView() {
    // eslint-disable-next-line no-console
    // console.log('sort:', Utils.dueCardsView());
    return Utils.dueCardsView();
  },

  events() {
    return [
      {
        'click .js-toggle-my-cards-choose-sort'() {
          // eslint-disable-next-line no-console
          // console.log('open sort');
          // Popup.open('dueCardsViewChange');
          Utils.dueCardsViewToggle();
        },
      },
    ];
  },
}).register('dueCardsHeaderBar');

Template.dueCards.helpers({
  userId() {
    return Meteor.userId();
  },
});

BlazeComponent.extendComponent({
  events() {
    return [
      {
        'click .js-my-cards-sort-board'() {
          Utils.setMyCardsSort('board');
          Popup.close();
        },

        'click .js-my-cards-sort-dueat'() {
          Utils.setMyCardsSort('dueAt');
          Popup.close();
        },
      },
    ];
  },
}).register('dueCardsViewChangePopup');

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
    Meteor.subscribe('dueCards');
  },

  dueCardsView() {
    // eslint-disable-next-line no-console
    console.log('sort:', Utils.dueCardsView());
    return Utils.dueCardsView();
  },

  sortByBoard() {
    return this.dueCardsView() === 'board';
  },

  dueCardsList() {
    const allUsers = false;

    const user = Meteor.user();

    const archivedBoards = [];
    Boards.find({ archived: true }).forEach(board => {
      archivedBoards.push(board._id);
    });

    const permiitedBoards = [];
    let selector = {
      archived: false,
    };
    // if user is not an admin allow her to see cards only from public boards
    // or those where she is a member
    if (!user.isAdmin) {
      selector.$or = [
        { permission: 'public' },
        { members: { $elemMatch: { userId: user._id, isActive: true } } },
      ];
    }
    Boards.find(selector).forEach(board => {
      permiitedBoards.push(board._id);
    });

    const archivedSwimlanes = [];
    Swimlanes.find({ archived: true }).forEach(swimlane => {
      archivedSwimlanes.push(swimlane._id);
    });

    const archivedLists = [];
    Lists.find({ archived: true }).forEach(list => {
      archivedLists.push(list._id);
    });

    selector = {
      archived: false,
      boardId: {
        $nin: archivedBoards,
        $in: permiitedBoards,
      },
      swimlaneId: { $nin: archivedSwimlanes },
      listId: { $nin: archivedLists },
      dueAt: { $ne: null },
      endAt: null,
    };

    if (!allUsers) {
      selector.$or = [{ members: user._id }, { assignees: user._id }];
    }

    const cards = [];

    // eslint-disable-next-line no-console
    // console.log('cards selector:', selector);
    Cards.find(selector).forEach(card => {
      cards.push(card);
      // eslint-disable-next-line no-console
      // console.log(
      //   'board:',
      //   card.board(),
      //   'swimlane:',
      //   card.swimlane(),
      //   'list:',
      //   card.list(),
      // );
    });

    cards.sort((a, b) => {
      const x = a.dueAt === null ? Date('2100-12-31') : a.dueAt;
      const y = b.dueAt === null ? Date('2100-12-31') : b.dueAt;

      if (x > y) return 1;
      else if (x < y) return -1;

      return 0;
    });

    // eslint-disable-next-line no-console
    // console.log('cards:', cards);
    return cards;
  },
}).register('dueCards');
