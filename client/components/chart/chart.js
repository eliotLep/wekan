const { calculateIndex } = Utils;

//script(src="../node_modules/chart.js/dist/Chart.bundle.js")

//const Chart = require('chart.js');
import Chart from 'chart.js';
import Mongo from 'meteor/mongo'




class Sprint {
  constructor(receivedAt,dueAt){
    this.receivedAt = receivedAt;
    this.dueAt = dueAt;
    this.numTasksTot = 0;
    this.numTasksDone = 0;
  }

  addTaskTot(nbTasks){
    this.numTasksTot+=nbTasks;
  }
  setTasksTot(nbTasks){
    this.numTasksTot=nbTasks;
  }
  remTaskTot(nbTasks){
    this.numTasksTot-=nbTasks;
  }

  setTasksDone(nbTasks){
    this.numTasksDone=nbTasks;
  }
  addTaskDone(nbTasks){
    this.numTasksDone+=nbTasks;
  }
  remTaskDone(nbTasks){
    this.numTasksDone-=nbTasks;
  }

}


BlazeComponent.extendComponent({



  onRendered() {

    //on recupere toutes les cartes
    const cardsDueTime = Cards.find().fetch();

    //contiendra la date des sprints
    var sprints = new Array();


    for(var i=0;i<cardsDueTime.length;i++){
      var item = cardsDueTime[i];

      if(item.dueAt==null || item.dueAt==undefined || item.receivedAt==null || item.receivedAt==undefined){
        continue;
      }
      var receivedAt = item.receivedAt;
      var dueAt = item.dueAt;

      var test=0;
      for(var j=0;j<sprints.length;j++){
        var itemSprint = sprints[j];
        if( itemSprint.dueAt.getDay()==dueAt.getDay() ){
          test=1;
          break;
        }
      }
      if(test==0){
        sprints.push( new Sprint(receivedAt,dueAt) );
      }

    }

    //on setup les valeurs global du projet
    var totalTaskCount=0;
    var dateStartProject;
    var dateEndProject;
    if(sprints.length>0){
      dateStartProject=sprints[0].receivedAt;
      dateEndProject=sprints[0].dueAt;
    }
    for(var i=0;i<sprints.length;i++){
      if(dateStartProject>sprints[i].receivedAt){
        dateStartProject = sprints[i].receivedAt;
      }
      if(dateEndProject<sprints[i].dueAt){
        dateEndProject = sprints[i].dueAt;
      }

    }


    for(var i=0;i<sprints.length;i++){
      var item = sprints[i];

      //on recupere les tasks de ce sprint.
      var sprintTasksTot = Cards.find( {receivedAt : {"$gte": item.receivedAt,"$lt": item.dueAt} } ).fetch();

      totalTaskCount+=sprintTasksTot.length;

      //on recupere les tasks terminé pour ce sprint
      var sprintTasksDone=new Array();
      for(var j=0;j<sprintTasksTot.length;j++){
        if(sprintTasksTot[j].endAt!=null && sprintTasksTot[j].endAt!=undefined){
          sprintTasksDone.push(sprintTasksTot[j]);
        }
      }

      item.setTasksTot(sprintTasksTot.length);
      item.setTasksDone(sprintTasksDone.length);
    }


    //affichage console
    console.log('nb sprint : '+sprints.length );
    if(sprints.length>0){
      console.log('tache terminé premier sprint : '+sprints[0].numTasksDone );
    }
    console.log('tache tot : '+totalTaskCount );
    console.log('debut proj : '+dateStartProject );
    console.log('fin proj : '+dateEndProject );



    const ctx = document.getElementById('myChart').getContext('2d');

    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
        datasets: [
          {
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
              },
            },
          ],
        },
      },
    });
  },
}).register('chart');
