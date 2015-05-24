
// Get the teams from the server with an ajax call.
getTeams = function(){
  $.ajax({
    url: 'http://localhost:8080/teams',
    type: 'GET',
    dataType: 'json'
  })
  .done(function(data) {
    sortedData = data.sort(function(t1,t2) {
      return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;
    });
    createTeamObjects(sortedData)
  })
  .fail(function() {
    console.log("error, is the server running?");
  })
}

// Creating a new custom object for each team from the server with relevant sttistic keys.
createTeamObjects = function(teamData){

  teams = []

  $.each(teamData, function(index, team){
    teamObject = {
      id: team.id,
      Name: team.name,
      Wins: 0,
      Draws: 0,
      Losses: 0,
      For: 0,
      Against: 0,
      GD: 0,
      Points: 0
    }
    teams.push(teamObject)
  })
  //Create the first html table using the json data. Sorted alphabetically as all teams start on 0 points.
  buildLeagueTable(teams)
  //Call the function to open the websocket and start consuming the fixtures. Pass teams into the function to give access to the newly created Team objects to other functions.
  openWebSocket(teams)
}


  // Function to update statistics for the winning home teams and opponents.
  homeWin = function(homeTeam, awayTeam, fixtures){
    homeTeam.Wins += 1;
    homeTeam.Points += 3;
    homeTeam.For += parseInt(fixtures.homeGoals);
    homeTeam.Against += parseInt(fixtures.awayGoals);
    homeTeam.GD = homeTeam.For - homeTeam.Against;
    awayTeam.Losses += 1;
    awayTeam.For += parseInt(fixtures.awayGoals);
    awayTeam.Against += parseInt(fixtures.homeGoals);
    awayTeam.GD = awayTeam.For - awayTeam.Against;
  }


  // Function to update statistics for a draw.
  draw = function(homeTeam, awayTeam, fixtures){
    homeTeam.Draws += 1;
    homeTeam.Points += 1;
    homeTeam.For += parseInt(fixtures.homeGoals);
    homeTeam.Against += parseInt(fixtures.awayGoals);
    awayTeam.Draws += 1;
    awayTeam.Points += 1;
    awayTeam.For += parseInt(fixtures.awayGoals);
    awayTeam.Against += parseInt(fixtures.homeGoals);
  }

  // Function to update statistics for the winning away teams an opponents.
  awayWin = function(homeTeam, awayTeam, fixtures){
    awayTeam.Wins += 1;
    awayTeam.Points += 3;
    awayTeam.For += parseInt(fixtures.awayGoals);
    awayTeam.Against += parseInt(fixtures.homeGoals);
    awayTeam.GD = awayTeam.For - awayTeam.Against;
    homeTeam.Losses += 1;
    homeTeam.For += parseInt(fixtures.homeGoals);
    homeTeam.Against += parseInt(fixtures.awayGoals);
    homeTeam.GD = homeTeam.For - homeTeam.Against;
  }


// Function to sort the teams by points then goal diffrence then goals for and finally alphabetical order if all previous statistics are equal.
sortTeams = function(teams){
  sortedTeams = teams.sort(
    firstBy(function (t1, t2) { return t2.Points - t1.Points; })
    .thenBy(function (t1, t2) { return t2.GD - t1.GD; })
    .thenBy(function (t1, t2) { return t2.For - t1.For; })
    .thenBy(function (t1, t2){ return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;})
    );
    // Rebuild the html table with the new sorted teams after the statistics have been updated.
    buildLeagueTable(sortedTeams)
  }

  updateNewTable = function(fixtures, teams){

    //Find the home team object from the teams array by matching the team id with the homeTeamId in the present fixture consumed from the websocket.
    homeTeam = teams.find(function (team) {
      return team.id == fixtures.homeTeamId;
    })
    //Find the away team object from the teams array by matching the team id with the awayTeamId in the present fixture consumed from the websocket.
    awayTeam = teams.find(function (team) {
      return team.id == fixtures.awayTeamId;
    })

    // Find which team has won or if it is a draw and call the relevant function to update statistics. Using the ECMAScript6 Polyfill find function.
    if(fixtures.homeGoals > fixtures.awayGoals){
      homeWin(homeTeam, awayTeam, fixtures)
    }else if(fixtures.homeGoals == fixtures.awayGoals){
      draw(homeTeam, awayTeam, fixtures)
    }else{
      awayWin(homeTeam, awayTeam, fixtures)
    }
    // Adding the fixture dates to the DOM to allow the user to see what the table looked like during different gameweeks.
    $('#week').text(fixtures.date)

    // Sort the teams again once the statistics have been updated.     
    sortTeams(teams)
  }

// Create the html premier league table using the json team data passed to the function.
function buildLeagueTable(teams) {
  $("#PLTable").empty()
  var columns = addAllColumnHeaders(teams);
  for (var i = 0 ; i < teams.length ; i++) {
   var row$ = $('<tr/>');
   for (var colIndex = 0 ; colIndex < columns.length ; colIndex++) {
     var cellValue = teams[i][columns[colIndex]];

     if (cellValue == null) { cellValue = ""; }

     row$.append($('<td/>').html(cellValue));
   }
   $("#PLTable").append(row$);
 }
}

   // Adds a header row to the table and returns the set of columns using the team objects from the teams array. Excludes the team id field from the table.
   function addAllColumnHeaders(teams)
   {
     var columnSet = [];
     var headerTr$ = $('<tr/>');

     for (var i = 0 ; i < teams.length ; i++) {
       var rowHash = teams[i];
       for (var key in rowHash) {
         if ($.inArray(key, columnSet) == -1){
          if(key != "id"){
            columnSet.push(key);
            headerTr$.append($('<th/>').html(key));
          }
        }
      }
    }
    $("#PLTable").append(headerTr$);

    return columnSet;
  };

// Connect to the WebSocket.
function openWebSocket(teams){
  if ("WebSocket" in window){
    // Open the web socket
    var ws = new WebSocket("ws://localhost:8080/games");

    ws.onmessage = function(evt){ 
      fixtures = JSON.parse(evt.data)
      updateNewTable(fixtures, teams)
    };
  };
};


$(function(){

  // Get the teams json data from the server.
  getTeams();

});


