$('#statistics').hide();
$('#unavailable').hide();

var nConstituencies = 585; // Scottish constituencies aren't included in census data

var greens = ["#63D7C0", "#3AC7AB", "#18BC9C", "#00A686", "#007D65"];
var oranges = ["#FFAC76", "#FF914A", "#FF7821", "#FF6400", "#C44D00"];
var greys = ["#BAB9B9", "#A1A0A0", "#888888", "#6E6E6E", "#515151"]

var householdTypesChart;
var averageHouseholdTypesChart;
var familyHouseholdTypesChart;
var averageFamilyHouseholdTypesChart;

$.when($.get("constituencies.tsv"), $.get("MPs.tsv")).done(function (constituencyData, mpData) {
  var lines = constituencyData[0].split("\n")
  var constituencies = {};
  var constituencyCodes = {};
  for (i in lines) {
    name = lines[i].split("\t")[0];
    code = lines[i].split("\t")[1];
    constituencies[name] = code
    constituencyCodes[code] = { "name": name }
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
    window.location.hash = '#' + code;
    loadData(code);
    return false;
  });

  var loadData = function(code) {
    showConstituency(code);
    if (code.substr(0,1) == "S") {
      $('#statistics').hide();
      $('#unavailable').show();
    } else {
      $('#statistics').show();
      $('#unavailable').hide();
      showPopulation(code);
      showHouseholds(code);
      showEmptyHomes(code);
      showShelters(code);
    }
  };

  var showConstituency = function(code) {
    var constituency = constituencyCodes[code];
    if (constituency !== undefined) {
      $('#constituencyName').text(constituency["mp"] + ": MP for " + constituency["name"]);
    }
  };

  var showPopulation = function(code) {
    $("#population").hide();
    loadONSstats("KS101EW", 1, code, function (data) {
      var population = data["All categories: Sex"];
      $("#population .local .value").text(population);
      $("#population").show();
    });
  };

  var showHouseholds = function(code) {
    $("#households").hide();
    if (householdTypesChart !== undefined) { householdTypesChart.destroy(); }
    if (familyHouseholdTypesChart !== undefined) { familyHouseholdTypesChart.destroy(); }
    if (averageHouseholdTypesChart !== undefined) { averageHouseholdTypesChart.destroy(); }
    if (averageFamilyHouseholdTypesChart !== undefined) { averageFamilyHouseholdTypesChart.destroy(); }

    loadONSstats("KS105EW", 1, code, function (data) {
      var width = $('#householdTypes').parent().parent().parent().width() / 2;
      $('canvas').width(width).height(width);
      var all = data["All categories: Household composition"];

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
        value: Math.round(5334676 / nConstituencies),
        color: greys[0],
        highlight: greens[0],
        label: "Individuals"
      }, {
        value: Math.round(4116716 / nConstituencies),
        color: greys[1],
        highlight: greens[1],
        label: "Couples"
      }, {
        value: Math.round(6790815 / nConstituencies),
        color: greys[2],
        highlight: greens[2],
        label: "Families with children"
      }, {
        value: Math.round(2248347 / nConstituencies),
        color: greys[3],
        highlight: greens[3],
        label: "Multigeneration households"
      }, {
        value: Math.round(4875490 / nConstituencies),
        color: greys[4],
        highlight: greens[4],
        label: "Elderly households"
      }];

      averageFamilyChartData = [{
        value: Math.round(3557230 / nConstituencies),
        color: greys[0],
        highlight: greens[0],
        label: "Married parents"
      }, {
        value: Math.round(949564 / nConstituencies),
        color: greys[1],
        highlight: greens[1],
        label: "Cohabiting parents"
      }, {
        value: Math.round(612625 / nConstituencies),
        color: greys[2],
        highlight: greens[2],
        label: "Other families"
      }, {
        value: Math.round(1671396 / nConstituencies),
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
    });
  };

  var showEmptyHomes = function(code) {
    $('#emptyHomes').hide();
    loadONSstats("KS401EW", 2, code, function (data) {
      var emptyHomes = data["Household spaces with no usual residents"];
      $("#emptyHomes .local .value").text(emptyHomes);
      $('#emptyHomes').show();
    });
  };

  var showShelters = function(code) {
    $('#shelters').hide();
    loadONSstats("QS101EW", 2, code, function (data) {
      var shelters = data["Communal establishments with persons sleeping rough identified"];
      $('#shelters .local .value').text(shelters);
      $('#shelters').show();
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
