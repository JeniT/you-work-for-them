$('#statistics').hide();
$('#unavailable').hide();
$('#votes').hide();

var nConstituencies = 585; // Scottish constituencies aren't included in census data

var greens = ["#63D7C0", "#3AC7AB", "#18BC9C", "#00A686", "#007D65"];
var oranges = ["#FFAC76", "#FF914A", "#FF7821", "#FF6400", "#C44D00"];
var greys = ["#BAB9B9", "#A1A0A0", "#888888", "#6E6E6E", "#515151"]

var partyColors = {
  "Con": "#0087DC",
  "Lab": "#DC241f",
  "LD": "#FDBB30",
  "Green": "#6AB023",
  "UKIP": "#70147A",
  "SNP": "yellow",
  "PC": "#00FF00",
  "DUP": "#FF0000",
  "Alliance": "yellow",
  "UUP": "#FF0000",
  "SDLP": "#00FF00",
  "other": "#999999",
  "DNV": "#CCCCCC"
}
var partyCodes = Object.keys(partyColors);

var nationalResults = { 
  "DNV": 0,
  "other": 0 
};

var ageGroupChart;
var averageAgeGroupChart;
var passportsChart;
var averagePassportsChart;
var householdTypesChart;
var averageHouseholdTypesChart;
var familyHouseholdTypesChart;
var averageFamilyHouseholdTypesChart;
var constituencyVotesChart;
var nationalVotesChart;

Chart.defaults.global.tooltipTemplate = "<%if (label){%><%=label%>: <%}%><%= value.toLocaleString() %>"

$.when($.get("constituencies.tsv"), $.get("MPs.tsv"), $.get("election-results.tsv"))
  .done(function (constituencyData, mpData, electionResultData) {
    var lines = constituencyData[0].split("\n")
    var constituencies = {};
    var constituencyCodes = {};
    for (i in lines) {
      if (i > 0) {
        name = lines[i].split("\t")[0];
        code = lines[i].split("\t")[1];
        electorate = Number.parseInt(lines[i].split("\t")[2]);
        votes = Number.parseInt(lines[i].split("\t")[3]);
        constituencies[name] = code
        constituencyCodes[code] = { 
          "name": name,
          "results": {
            "DNV": electorate - votes
          }
        }
        nationalResults["DNV"] += electorate - votes;
      }
    }

    var constituencyLookup = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: Object.keys(constituencies)
    });

    var lines = mpData[0].split("\n")
    var mps = {}
    for (i in lines) {
      name = lines[i].split("\t")[0];
      code = lines[i].split("\t")[1];
      mps[name] = code;
      constituencyCodes[code]["mp"] = name;
    }

    var mpLookup = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: Object.keys(mps)
    });

    var lines = electionResultData[0].split("\r\n")
    for (i in lines) {
      if (i > 0) {
        code = lines[i].split("\t")[11];
        party = lines[i].split("\t")[18];
        votes = Number.parseInt(lines[i].split("\t")[5]);
        if ($.inArray(party, partyCodes) !== -1) {
          constituencyCodes[code]["results"][party] = votes;
          if (nationalResults[party] == undefined) {
            nationalResults[party] = 0;
          }
          nationalResults[party] += votes;
        } else {
          if (constituencyCodes[code]["results"]["other"] == undefined) {
            constituencyCodes[code]["results"]["other"] = 0;
          }
          constituencyCodes[code]["results"]["other"] += votes;
          nationalResults["other"] += votes;
        }
      }
    }

    $('#constituency').typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    },
    {
      name: 'constituency',
      source: constituencyLookup,
      templates: {
        header: '<h3 class="search-type">Constituencies</h3>'
      }
    },
    {
      name: 'mps',
      source: mpLookup,
      templates: {
        header: '<h3 class="search-type">MPs</h3>'
      }
    });

    $("#search").submit(function (event) {
      $('#constituency').typeahead('close');
      var search = $('#constituency').typeahead('val');
      var code = constituencies[search];
      if (code == undefined) {
        code = mps[search];
      }
      if (code !== undefined) {
        window.location.hash = '#' + code;
        loadData(code);
      }
      return false;
    });

    var loadData = function(code) {
      showConstituency(code);
      showVotes(code);
      if (code.substr(0,1) == "S" || code.substr(0,1) == "N") {
        $('#statistics').hide();
        $('#unavailable').show();
      } else {
        $('#statistics').show();
        $('#unavailable').hide();
        showPopulation(code);
        showAgeGroups(code);
        showMigration(code);
        showHouseholds(code);
        showEmptyHomes(code);
        showShelters(code);
        showOccupations(code);
      }
    };

    var showConstituency = function(code) {
      var constituency = constituencyCodes[code];
      if (constituency !== undefined) {
        $('#constituencyName').text(constituency["mp"] + ": MP for " + constituency["name"]);
      }
    };

    var showVotes = function(code) {
      if (constituencyVotesChart !== undefined) { constituencyVotesChart.destroy(); }
      if (nationalVotesChart !== undefined) { nationalVotesChart.destroy(); }
      var constituency = constituencyCodes[code];
      var results = constituency["results"];
      voteData = [];
      addVotes(voteData, results, "Con"); 
      addVotes(voteData, results, "Lab"); 
      addVotes(voteData, results, "UKIP"); 
      addVotes(voteData, results, "LD"); 
      addVotes(voteData, results, "SNP"); 
      addVotes(voteData, results, "Green"); 
      addVotes(voteData, results, "PC"); 
      addVotes(voteData, results, "DUP"); 
      addVotes(voteData, results, "Alliance"); 
      addVotes(voteData, results, "SDLP"); 
      addVotes(voteData, results, "UUP"); 
      addVotes(voteData, results, "other"); 
      addVotes(voteData, results, "DNV"); 
      nationalVoteData = [];
      addVotes(nationalVoteData, nationalResults, "Con"); 
      addVotes(nationalVoteData, nationalResults, "Lab"); 
      addVotes(nationalVoteData, nationalResults, "UKIP"); 
      addVotes(nationalVoteData, nationalResults, "LD"); 
      addVotes(nationalVoteData, nationalResults, "SNP"); 
      addVotes(nationalVoteData, nationalResults, "Green"); 
      addVotes(nationalVoteData, nationalResults, "PC"); 
      addVotes(nationalVoteData, nationalResults, "DUP"); 
      addVotes(nationalVoteData, nationalResults, "Alliance"); 
      addVotes(nationalVoteData, nationalResults, "SDLP"); 
      addVotes(nationalVoteData, nationalResults, "UUP"); 
      addVotes(nationalVoteData, nationalResults, "other"); 
      addVotes(nationalVoteData, nationalResults, "DNV"); 
      $('#votes').show();
      var width = $('#constituencyVotes').parent().width() * 0.75;
      $('canvas').width(width).height(width);
      $('.legend').height(width + 30);
      var ctx = $('#constituencyVotes').get(0).getContext("2d");
      constituencyVotesChart = new Chart(ctx).Doughnut(voteData);
      var ctx = $('#nationalVotes').get(0).getContext("2d");
      nationalVotesChart = new Chart(ctx).Doughnut(nationalVoteData);
      $('#votesLegend').html(nationalVotesChart.generateLegend())
    };

    var addVotes = function(array, results, party) {
      if (results[party] > 0) {
        array.push({
          value: results[party],
          color: partyColors[party],
          highlight: partyColors[party],
          label: party == "DNV" ? "Didn't vote" : party
        });
      }
      return array;
    };

    var showPopulation = function(code) {
      $("#population").hide();
      loadONSstats("KS101EW", 1, code, function (data) {
        var population = data["All categories: Sex"];
        $("#population .local .value").text(population.toLocaleString());
        $("#population").show();
      });
    };

    var showAgeGroups = function(code) {
      $("#agebreakdown").hide();
      if (ageGroupChart !== undefined) { ageGroupChart.destroy(); }
      if (averageAgeGroupChart !== undefined) { averageAgeGroupChart.destroy(); }

      loadONSstats("KS102EW", 1, code, function (data) {
        var all = data["All categories: Age"];
        var proportion = all / 56075912;

        var elderly = adults = youngAdults = children = 0;
        elderly += data["Age 65 to 74"];
        elderly += data["Age 75 to 84"];
        elderly += data["Age 85 to 89"];
        elderly += data["Age 90 and over"];
        adults += data["Age 25 to 29"];
        adults += data["Age 30 to 44"];
        adults += data["Age 45 to 59"];
        adults += data["Age 60 to 64"];
        youngAdults += data["Age 18 to 19"];
        youngAdults += data["Age 20 to 24"];
        children += data["Age 0 to 4"];
        children += data["Age 5 to 7"];
        children += data["Age 8 to 9"];
        children += data["Age 10 to 14"];
        children += data["Age 15"];
        children += data["Age 16 to 17"];

        chartData = [{
          value: children,
          color: greens[0],
          highlight: oranges[0],
          label: "Children 0-17"
        }, {
          value: youngAdults,
          color: greens[1],
          highlight: oranges[1],
          label: "Young Adults 18-24"
        }, {
          value: adults,
          color: greens[2],
          highlight: oranges[2],
          label: "Adults 25-64"
        }, {
          value: elderly,
          color: greens[3],
          highlight: oranges[3],
          label: "Elderly 65+"
        }];

        averageChartData = [{
          value: Math.round(11970367 * proportion),
          color: greys[0],
          highlight: greens[0],
          label: "Children 0-17"
        }, {
          value: Math.round(5267401 * proportion),
          color: greys[1],
          highlight: greens[1],
          label: "Young Adults 18-24"
        }, {
          value: Math.round(29615071 * proportion),
          color: greys[2],
          highlight: greens[2],
          label: "Adults 25-64"
        }, {
          value: Math.round(9223073 * proportion),
          color: greys[3],
          highlight: greens[3],
          label: "Elderly 65+"
        }];

        $('#agebreakdown').show();
        var ctx = $('#ageGroups').get(0).getContext("2d");
        ageGroupChart = new Chart(ctx).Doughnut(chartData);
        var ctx = $('#averageAgeGroups').get(0).getContext("2d");
        averageAgeGroupChart = new Chart(ctx).Doughnut(averageChartData);
        $('#ageGroupsLegend').html(ageGroupChart.generateLegend())
       });
    };

    var showMigration = function(code) {
      $("#migration").hide();
      if (passportsChart !== undefined) { passportsChart.destroy(); }
      if (averagePassportsChart !== undefined) { averagePassportsChart.destroy(); }

      loadONSstats("KS205EW", 1, code, function (data) {
        var all = data["All usual residents"];
        var proportion = all / 56075912;

        var uk = europe = africa = asia = northAmerica = otherAmerica = oceania = none = 0;
        uk += data["United Kingdom"];
        uk += data["British Overseas Territories"];
        europe += data["Republic of Ireland"];
        europe += data["Other Europe: EU countries"];
        europe += data["Other Europe: Non EU countries"];
        africa += data["Africa"];
        asia += data["Middle East and Asia"];
        northAmerica += data["North America and the Caribbean"];
        otherAmerica += data["Central America"];
        otherAmerica += data["South America"];
        oceania += data["Antarctica and Oceania"];
        none += data["No passport"];

        chartData = [{
          value: uk,
          color: greens[0],
          highlight: oranges[0],
          label: "United Kingdom"
        }, {
          value: europe,
          color: greens[1],
          highlight: oranges[1],
          label: "Europe"
        }, {
          value: oceania,
          color: greens[2],
          highlight: oranges[2],
          label: "Antarctica and Oceania"
        }, {
          value: asia,
          color: greens[3],
          highlight: oranges[3],
          label: "Middle East and Asia"
        }, {
          value: africa,
          color: greens[4],
          highlight: oranges[4],
          label: "Africa"
        }, {
          value: northAmerica,
          color: greens[4],
          highlight: oranges[4],
          label: "North America"
        }, {
          value: otherAmerica,
          color: greens[4],
          highlight: oranges[4],
          label: "Other America"
        }, {
          value: none,
          color: "#CCCCCC",
          highlight: "#CCCCCC",
          label: "No passport"
        }];

        averageChartData = [{
          value: Math.round(42458647 * proportion),
          color: greys[0],
          highlight: greens[0],
          label: "United Kingdom"
        }, {
          value: Math.round(2498877 * proportion),
          color: greys[1],
          highlight: greens[1],
          label: "Europe"
        }, {
          value: Math.round(2107025 * proportion),
          color: greys[2],
          highlight: greens[2],
          label: "Antarctica and Oceania"
        }, {
          value: Math.round(1135432 * proportion),
          color: greys[3],
          highlight: greens[3],
          label: "Middle East and Asia"
        }, {
          value: Math.round(520635 * proportion),
          color: greys[4],
          highlight: greens[4],
          label: "Africa"
        }, {
          value: Math.round(336241 * proportion),
          color: greys[4],
          highlight: greens[4],
          label: "North America"
        }, {
          value: Math.round(83490 * proportion),
          color: greys[4],
          highlight: greens[4],
          label: "Other America"
        }, {
          value: Math.round(9458051 * proportion),
          color: "#CCCCCC",
          highlight: "#CCCCCC",
          label: "No passport"
        }];

        $('#migration').show();
        var ctx = $('#passports').get(0).getContext("2d");
        passportsChart = new Chart(ctx).Doughnut(chartData);
        var ctx = $('#averagePassports').get(0).getContext("2d");
        averagePassportsChart = new Chart(ctx).Doughnut(averageChartData);
        $('#passportsLegend').html(passportsChart.generateLegend())
       });
    };

    var showHouseholds = function(code) {
      $("#households").hide();
      if (householdTypesChart !== undefined) { householdTypesChart.destroy(); }
      if (familyHouseholdTypesChart !== undefined) { familyHouseholdTypesChart.destroy(); }
      if (averageHouseholdTypesChart !== undefined) { averageHouseholdTypesChart.destroy(); }
      if (averageFamilyHouseholdTypesChart !== undefined) { averageFamilyHouseholdTypesChart.destroy(); }

      loadONSstats("KS105EW", 1, code, function (data) {
        var all = data["All categories: Household composition"];
        var proportion = all / 23366044;

        var elderly = multigeneration = families = couples = singles = 0;
        elderly += data["One family only: All aged 65 and over"];
        elderly += data["One person household: Aged 65 and over"];
        elderly += data["Other household types: All aged 65 and over"];
        multigeneration += data["One family only: Lone parent: All children non-dependent"];
        multigeneration += data["One family only: Married or same-sex civil partnership couple: All children non-dependent"];
        multigeneration += data["One family only: Cohabiting couple: All children non-dependent"];
        families += data["One family only: Lone parent: Dependent children"];
        families += data["One family only: Married or same-sex civil partnership couple: Dependent children"];
        families += data["One family only: Cohabiting couple: Dependent children"];
        families += data["Other household types: With dependent children"];
        couples += data["One family only: Married or same-sex civil partnership couple: No children"];
        couples += data["One family only: Cohabiting couple: No children"];
        singles += data["One person household: Other"];
        singles += data["Other household types: All full-time students"];
        singles += data["Other household types: Other"];

        chartData = [{
          value: singles,
          color: greens[0],
          highlight: oranges[0],
          label: "Individuals"
        }, {
          value: couples,
          color: greens[1],
          highlight: oranges[1],
          label: "Couples"
        }, {
          value: families,
          color: greens[2],
          highlight: oranges[2],
          label: "Families with children"
        }, {
          value: multigeneration,
          color: greens[3],
          highlight: oranges[3],
          label: "Multigeneration households"
        }, {
          value: elderly,
          color: greens[4],
          highlight: oranges[4],
          label: "Elderly households"
        }];

        var singleParent = data["One family only: Lone parent: Dependent children"];
        var married = data["One family only: Married or same-sex civil partnership couple: Dependent children"];
        var cohabiting = data["One family only: Cohabiting couple: Dependent children"];
        var other = data["Other household types: With dependent children"];
        familyChartData = [{
          value: married,
          color: greens[0],
          highlight: oranges[0],
          label: "Married parents"
        }, {
          value: cohabiting,
          color: greens[1],
          highlight: oranges[1],
          label: "Cohabiting parents"
        }, {
          value: other,
          color: greens[2],
          highlight: oranges[2],
          label: "Other families"
        }, {
          value: singleParent,
          color: greens[3],
          highlight: oranges[3],
          label: "Lone parents"
        }];

        averageChartData = [{
          value: Math.round(5334676 * proportion),
          color: greys[0],
          highlight: greens[0],
          label: "Individuals"
        }, {
          value: Math.round(4116716 * proportion),
          color: greys[1],
          highlight: greens[1],
          label: "Couples"
        }, {
          value: Math.round(6790815 * proportion ),
          color: greys[2],
          highlight: greens[2],
          label: "Families with children"
        }, {
          value: Math.round(2248347 * proportion ),
          color: greys[3],
          highlight: greens[3],
          label: "Multigeneration households"
        }, {
          value: Math.round(4875490 * proportion ),
          color: greys[4],
          highlight: greens[4],
          label: "Elderly households"
        }];

        proportion = families / 6790815;
        averageFamilyChartData = [{
          value: Math.round(3557230 * proportion ),
          color: greys[0],
          highlight: greens[0],
          label: "Married parents"
        }, {
          value: Math.round(949564 * proportion ),
          color: greys[1],
          highlight: greens[1],
          label: "Cohabiting parents"
        }, {
          value: Math.round(612625 * proportion ),
          color: greys[2],
          highlight: greens[2],
          label: "Other families"
        }, {
          value: Math.round(1671396 * proportion ),
          color: greys[3],
          highlight: greens[3],
          label: "Lone parents"
        }];

        $('#households').show();
        var ctx = $('#householdTypes').get(0).getContext("2d");
        householdTypesChart = new Chart(ctx).Doughnut(chartData);
        var ctx = $('#familyHouseholdTypes').get(0).getContext("2d");
        familyHouseholdTypesChart = new Chart(ctx).Doughnut(familyChartData);
        var ctx = $('#averageHouseholdTypes').get(0).getContext("2d");
        averageHouseholdTypesChart = new Chart(ctx).Doughnut(averageChartData);
        var ctx = $('#averageFamilyHouseholdTypes').get(0).getContext("2d");
        averageFamilyHouseholdTypesChart = new Chart(ctx).Doughnut(averageFamilyChartData);
        $('#householdTypesLegend').html(householdTypesChart.generateLegend())
        $('#familyHouseholdTypesLegend').html(familyHouseholdTypesChart.generateLegend())
      });
    };

    var showEmptyHomes = function(code) {
      $('#emptyHomes').hide();
      loadONSstats("KS401EW", 2, code, function (data) {
        var emptyHomes = data["Household spaces with no usual residents"];
        $("#emptyHomes .local .value").text(emptyHomes.toLocaleString());
        $('#emptyHomes').show();
      });
    };

    var showShelters = function(code) {
      $('#shelters').hide();
      loadONSstats("QS101EW", 2, code, function (data) {
        var shelters = data["Communal establishments with persons sleeping rough identified"];
        $('#shelters .local .value').text(shelters.toLocaleString());
        $('#shelters').show();
      });
    };

    var showOccupations = function(code) {
      $('#occupations').hide();
      var scale = 150;
      loadONSstats("KS608EW", 1, code, function (data) {
        var proportion = data["All categories: Occupation"] / 26526336;
        $('#occupation1 .graph ').width(data["1. Managers  directors and senior officials"] / scale);
        $('#occupation2 .graph ').width(data["2. Professional occupations"] / scale);
        $('#occupation3 .graph ').width(data["3. Associate professional and technical occupations"] / scale);
        $('#occupation4 .graph ').width(data["4. Administrative and secretarial occupations"] / scale);
        $('#occupation5 .graph ').width(data["5. Skilled trades occupations"] / scale);
        $('#occupation6 .graph ').width(data["6. Caring  leisure and other service occupations"] / scale);
        $('#occupation7 .graph ').width(data["7. Sales and customer service occupations"] / scale);
        $('#occupation8 .graph ').width(data["8. Process  plant and machine operatives"] / scale);
        $('#occupation9 .graph ').width(data["9. Elementary occupations"] / scale);
        $('#occupation1 .value').text(data["1. Managers  directors and senior officials"].toLocaleString());
        $('#occupation2 .value').text(data["2. Professional occupations"].toLocaleString());
        $('#occupation3 .value').text(data["3. Associate professional and technical occupations"].toLocaleString());
        $('#occupation4 .value').text(data["4. Administrative and secretarial occupations"].toLocaleString());
        $('#occupation5 .value').text(data["5. Skilled trades occupations"].toLocaleString());
        $('#occupation6 .value').text(data["6. Caring  leisure and other service occupations"].toLocaleString());
        $('#occupation7 .value').text(data["7. Sales and customer service occupations"].toLocaleString());
        $('#occupation8 .value').text(data["8. Process  plant and machine operatives"].toLocaleString());
        $('#occupation9 .value').text(data["9. Elementary occupations"].toLocaleString());
        var averageOccupation1 = 2860702 * proportion;
        var averageOccupation2 = 4615759 * proportion;
        var averageOccupation3 = 3366313 * proportion;
        var averageOccupation4 = 3034637 * proportion;
        var averageOccupation5 = 3041957 * proportion;
        var averageOccupation6 = 2492117 * proportion;
        var averageOccupation7 = 2240869 * proportion;
        var averageOccupation8 = 1919017 * proportion;
        var averageOccupation9 = 2954965 * proportion;
        $('#averageOccupation1 .graph ').width(averageOccupation1 / scale);
        $('#averageOccupation2 .graph ').width(averageOccupation2 / scale);
        $('#averageOccupation3 .graph ').width(averageOccupation3 / scale);
        $('#averageOccupation4 .graph ').width(averageOccupation4 / scale);
        $('#averageOccupation5 .graph ').width(averageOccupation5 / scale);
        $('#averageOccupation6 .graph ').width(averageOccupation6 / scale);
        $('#averageOccupation7 .graph ').width(averageOccupation7 / scale);
        $('#averageOccupation8 .graph ').width(averageOccupation8 / scale);
        $('#averageOccupation9 .graph ').width(averageOccupation9 / scale);
        $('#averageOccupation1 .value').text(Math.round(averageOccupation1).toLocaleString());
        $('#averageOccupation2 .value').text(Math.round(averageOccupation2).toLocaleString());
        $('#averageOccupation3 .value').text(Math.round(averageOccupation3).toLocaleString());
        $('#averageOccupation4 .value').text(Math.round(averageOccupation4).toLocaleString());
        $('#averageOccupation5 .value').text(Math.round(averageOccupation5).toLocaleString());
        $('#averageOccupation6 .value').text(Math.round(averageOccupation6).toLocaleString());
        $('#averageOccupation7 .value').text(Math.round(averageOccupation7).toLocaleString());
        $('#averageOccupation8 .value').text(Math.round(averageOccupation8).toLocaleString());
        $('#averageOccupation9 .value').text(Math.round(averageOccupation9).toLocaleString());
        $('#occupations').show();
      });
    };

    var loadONSstats = function(dataset, segmentNo, area, callback) {
      $.get("http://www.ons.gov.uk/ons/api/data/dataset/" + dataset + ".json?context=Census&jsontype=json-stat&apikey=sqZtbN6sgJ&geog=2011PCONH&totals=false&dm/2011PCONH=" + area, function (data) {
        var segmentId = dataset + " Segment_" + segmentNo;
        var segment = data[segmentId];
        var values = segment["value"];
        var unvaryingDimensions = [];
        for (dType in segment["dimension"]["role"]) {
          unvaryingDimensions.push(segment["dimension"]["role"][dType][0]);
        }
        var dimension = "";
        for (i in segment["dimension"]["id"]) {
          dimensionId = segment["dimension"]["id"][i];
          if ($.inArray(dimensionId, unvaryingDimensions) == -1) {
            dimension = segment["dimension"][dimensionId];
          }
        }
        var response = {};
        var labels = dimension["category"]["label"];
        var indexes = dimension["category"]["index"];
        for (c in labels) {
          response[labels[c]] = values[indexes[c]]
        }
        callback(response);
      });
    };

    var code = window.location.hash.substr(1);

    if (code !== '') {
      loadData(code);
      $('#constituency').attr("placeholder", constituencyCodes[code]["name"])
    }
  });
