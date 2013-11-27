function generateQueueLaneLPStackDataset(json, cmpDate) {
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var pfBins = {};
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        if (appl == "Finished library") { continue; } // need seq start date to be able to handle fin lib projects

        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        
        // skip samples already done, but where dates are missing in lims
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }
        
        var queueDate = v["Queue date"];
        var prepStartDate = v["Lib prep start"];
        // this is for libprep projects
        if (queueDate != "0000-00-00" &&
            queueDate <= cmpDateStr &&
            prepStartDate == "0000-00-00") {
            //console.log(pf + ", " + pid + ", " + v["Lanes"]);

            // create bins for the platforms if they don't exist
            if(pfBins[pf] == undefined) {
                pfBins[pf] = {};
            }
            if(pfBins[otherPf] == undefined) {
                pfBins[otherPf] = {};
            }
            // initialize a value for the project if it doesn't exist in pfBins
            if(pfBins[pf][pid] == undefined) {
                pfBins[pf][pid] = 0;
            }
            if(pfBins[otherPf][pid] == undefined) {
                pfBins[otherPf][pid] = 0;
            }
            // add on lane load for this particular project
            pfBins[pf][pid] += v["Lanes"];

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        dataArray.push([hO, mO]);
    }
    dataArray.sort(sortByPlatform);
    
    var tot = { HiSeq: 0, MiSeq: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var pf = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[pf];
            tot[pf] += dataArray[i][j]["y"];
        }
    }
    //console.log(dataArray);
    
    return dataArray;
}

function generateQueueLaneFLStackDataset(json, cmpDate) {
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var pfBins = {};
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        if (appl != "Finished library") { continue; } // skip fin lib projects

        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }
        var queueDate = v["Queue date"];
        //var prepStartDate = v["Lib prep start"];
        var seqStartDate = v["Sequencing start"];
        // this is for libprep projects
        if (queueDate != "0000-00-00" &&
            queueDate <= cmpDateStr &&
            seqStartDate == "0000-00-00") {
            //console.log(pf + ", " + pid + ", " + v["Lanes"]);

            // create bins for the platforms if they don't exist
            if(pfBins[pf] == undefined) {
                pfBins[pf] = {};
            }
            if(pfBins[otherPf] == undefined) {
                pfBins[otherPf] = {};
            }
            // initialize a value for the project if it doesn't exist in pfBins
            if(pfBins[pf][pid] == undefined) {
                pfBins[pf][pid] = 0;
            }
            if(pfBins[otherPf][pid] == undefined) {
                pfBins[otherPf][pid] = 0;
            }
            // add on lane load for this particular project
            pfBins[pf][pid] += v["Lanes"];

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        dataArray.push([hO, mO]);
    }
    dataArray.sort(sortByPlatform);
    
    var tot = { HiSeq: 0, MiSeq: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var pf = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[pf];
            tot[pf] += dataArray[i][j]["y"];
        }
    }
    //console.log(dataArray);
    
    return dataArray;
}

function generateQueueSampleStackDataset(json, cmpDate) {

    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var applBins = {};
    var cat = ["DNA", "RNA", "SeqCap", "Other"];
    for (i = 0; i < cat.length; i++) {
        //console.log("adding " + cat[i]);
        applBins[cat[i]] = {};
    }
    //console.log(applBins);
    
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        var sampleID = k[4];
        if (appl == "Finished library") { continue; } // fin lib projects not of interest
        //console.log(sampleID);
        var applCat = "";
        if (appl.indexOf("capture") != -1) {
            applCat = "SeqCap";
        } else if (appl == "Amplicon" ||
                   appl == "de novo" ||
                   appl == "Metagenome" ||
                   appl == "WG re-seq") {
            applCat = "DNA";
        } else if (appl == "RNA-seq (total RNA)") {
            applCat = "RNA";
        } else {
            applCat = "Other";
        }
        
        var v = rows[i]["value"];
        
        // skip samples already done, but where dates are missing in lims
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }

        var queueDate = v["Queue date"];
        var prepStartDate = v["Lib prep start"];
        // this is for libprep projects
        if (queueDate != "0000-00-00" &&
            queueDate <= cmpDateStr &&
            prepStartDate == "0000-00-00") {
            //console.log("To add - app cat: " + applCat + ", pid: " + pid + ", sample: " + sampleID);
            // initialize a value for the project for all applications if it doesn't exist in applBins
            if(applBins[applCat][pid] == undefined) {
                //for (c in cat) {
                //    applBins[c][pid] = 0;
                //}
                for (var j = 0; j < cat.length; j++) {
                    applBins[cat[j]][pid] = 0;
                }
                
            }
            // add sample load for this particular project
            applBins[applCat][pid] += 1;

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in applBins["DNA"]) {
        var projArr = [];
        //for (c in cat) {
        for (i = 0; i < cat.length; i++) {
             var o = { x: cat[i], y: applBins[cat[i]][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
            projArr.push(o);
        }
        dataArray.push(projArr);
    }
    // change to sort by application
    dataArray.sort(sortByApplication);
    
    var tot = { DNA: 0, RNA: 0, SeqCap: 0, Other: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var a = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[a];
            tot[a] += dataArray[i][j]["y"];
        }
    }
    //console.log(dataArray);
        
    //return pfBins;
    return dataArray;
}

function generateLibprepSampleLoadDataset(json, cmpDate) {

    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var applBins = {};
    var cat = ["DNA", "RNA", "SeqCap", "Other"];
    for (i = 0; i < cat.length; i++) {
        //console.log("adding " + cat[i]);
        applBins[cat[i]] = {};
    }
    //console.log(applBins);
    
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        var sampleID = k[4];
        if (appl == "Finished library") { continue; } // fin lib projects not of interest
        //console.log(sampleID);
        var applCat = "";
        if (appl.indexOf("capture") != -1) {
            applCat = "SeqCap";
        } else if (appl == "Amplicon" ||
                   appl == "de novo" ||
                   appl == "Metagenome" ||
                   appl == "WG re-seq") {
            applCat = "DNA";
        } else if (appl == "RNA-seq (total RNA)") {
            applCat = "RNA";
        } else {
            applCat = "Other";
        }
        
        var v = rows[i]["value"];
        
        // skip samples already done, but where dates are missing in lims
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }

        var queueDate = v["Queue date"];
        var prepStartDate = v["Lib prep start"];
        var libQCDate = v["QC library finished"];
        //console.log("app cat: " + applCat + ", pid: " + pid + ", sample: " + sampleID + ", " + prepStartDate + "-" + libQCDate);
        // this is for libprep projects
        if (prepStartDate != "0000-00-00" &&
            prepStartDate <= cmpDateStr &&
            libQCDate == "0000-00-00") {
            //console.log("To add - app cat: " + applCat + ", pid: " + pid + ", sample: " + sampleID);
            // initialize a value for the project for all applications if it doesn't exist in applBins
            if(applBins[applCat][pid] == undefined) {
                for (var j = 0; j < cat.length; j++) {
                    applBins[cat[j]][pid] = 0;
                }
                
            }
            // add sample load for this particular project
            applBins[applCat][pid] += 1;

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in applBins["DNA"]) {
        var projArr = [];
        for (i = 0; i < cat.length; i++) {
             var o = { x: cat[i], y: applBins[cat[i]][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
            projArr.push(o);
        }
        dataArray.push(projArr);
    }
    // change to sort by application
    dataArray.sort(sortByApplication);
    
    var tot = { DNA: 0, RNA: 0, SeqCap: 0, Other: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var a = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[a];
            tot[a] += dataArray[i][j]["y"];
        }
    }
    if (dataArray.length == 0 ) {
        dataArray = [
                        [
                            { x: "DNA", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"},
                            { x: "RNA", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"},
                            { x: "SeqCap", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"},
                            { x: "Other", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"}
                        ]
                    ];
    }
    return dataArray;
}


function generateLibprepLaneLoadDataset(json, cmpDate) {
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var pfBins = {};
    var projects = {};
    for (var i = 0; i < rows.length; i++) {
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        if (appl == "Finished library") { continue; } // skip fin lib projects

        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        var queueDate = v["Queue date"];
        var prepStartDate = v["Lib prep start"];
        //console.log(prepStartDate);
        var libQCDate = v["QC library finished"];
        // this is for libprep projects
        if (prepStartDate != "0000-00-00" &&
            prepStartDate <= cmpDateStr &&
            libQCDate == "0000-00-00") {
            //console.log(pf + ", " + pid + ", " + v["Lanes"]);

            // create bins for the platforms if they don't exist
            if(pfBins[pf] == undefined) {
                pfBins[pf] = {};
            }
            if(pfBins[otherPf] == undefined) {
                pfBins[otherPf] = {};
            }
            // initialize a value for the project if it doesn't exist in pfBins
            if(pfBins[pf][pid] == undefined) {
                pfBins[pf][pid] = 0;
            }
            if(pfBins[otherPf][pid] == undefined) {
                pfBins[otherPf][pid] = 0;
            }
            // add on lane load for this particular project
            pfBins[pf][pid] += v["Lanes"];

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        dataArray.push([hO, mO]);
    }
    dataArray.sort(sortByPlatform);
    
    var tot = { HiSeq: 0, MiSeq: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var pf = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[pf];
            tot[pf] += dataArray[i][j]["y"];
        }
    }
    //console.log(dataArray);
    if (dataArray.length == 0 ) {
        dataArray = [
                        [
                            { x: "HiSeq", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"},
                            { x: "MiSeq", y: 0, y0: 0, pid: "Px", projName: "empty", queueDate: "0000-00-00"}
                        ]
                    ];
    }
    
    return dataArray;
}


function generateSeqLoadDataset(json, cmpDate) {
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var pfBins = {};
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var pid = k[0];
        var pn = k[1];
        var appl = k[2];
        var sid = k[4];

        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        var queueDate = v["Queue date"];
        var libQCDate = v["QC library finished"];
        var seqStartDate = v["Sequencing start"];
        var seqDoneDate = v["All samples sequenced"];

        // The start date of the process step depends on if project is libprep or fin lib
        var stepStartDate = libQCDate;
        if(appl == "Finished library") {
            stepStartDate = seqStartDate;
        }
        
        if (stepStartDate != "0000-00-00" &&
            libQCDate <= cmpDateStr &&
            seqDoneDate == "0000-00-00") {
            //console.log(pf + ", " + pid + ", " + v["Lanes"]);

            // create bins for the platforms if they don't exist
            if(pfBins[pf] == undefined) {
                pfBins[pf] = {};
            }
            if(pfBins[otherPf] == undefined) {
                pfBins[otherPf] = {};
            }
            // initialize a value for the project if it doesn't exist in pfBins
            if(pfBins[pf][pid] == undefined) {
                pfBins[pf][pid] = 0;
            }
            if(pfBins[otherPf][pid] == undefined) {
                pfBins[otherPf][pid] = 0;
            }
            // add on lane load for this particular project
            pfBins[pf][pid] += v["Lanes"];

            if(projects[pid] == undefined) {
                projects[pid] = { queueDate: queueDate, projName: pn}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, projName: projects[projID]["projName"], queueDate: projects[projID]["queueDate"] };
        dataArray.push([hO, mO]);
    }
    dataArray.sort(sortByPlatform);
    
    var tot = { HiSeq: 0, MiSeq: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var pf = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[pf];
            tot[pf] += dataArray[i][j]["y"];
        }
    }
    //console.log(dataArray);
    
    return dataArray;
}


function sortByPlatform (a, b) {
    aPf = "";
    bPf = "";
    for (var i = 0; i < a.length; i++) {
        if(a[i]["y"] != 0) { aPf = a[i]["x"]; aQ = a[i]["queueDate"]; }
        if(b[i]["y"] != 0) { bPf = b[i]["x"]; bQ = b[i]["queueDate"]; }
    }
    if(aPf < bPf) return -1;
    if(aPf > bPf) return 1;
    if(aQ < bQ ) return -1;
    if(aQ > bQ ) return 1;
    return 0;
}
function sortByApplication (a, b) {
    var map = {
        "DNA": 0,
        "RNA": 1,
        "SeqCap": 2,
        "Other": 3
    }
    
    var aAppl;
    var bAppl;
    for (var i = 0; i < a.length; i++) {
        if(a[i]["y"] != 0) { aAppl = map[a[i]["x"]]; aQ = a[i]["queueDate"]; }
        if(b[i]["y"] != 0) { bAppl = map[b[i]["x"]]; bQ = b[i]["queueDate"]; }
    }
    if(aAppl < bAppl) return -1;
    if(aAppl > bAppl) return 1;
    if(aQ < bQ ) return -1;
    if(aQ > bQ ) return 1;
    return 0;
}
function dateValueSort(a, b){
        var datediff = a[2] - b[2];
        if (datediff == 0) {
            return b[1] - a[1]; // longer del times sorted before shorter
        } else {
            return datediff;
        }
}

function drawStackedBars (dataset, divID, width, height, unit, padding) {
    var
        //w = 200,
        //h = 500,
        w = width,
        h = height,
        p = [30, 0, 30, 20], // t, r, b, l
        x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
        y = d3.scale.linear().range([0, h - p[0] - p[2]]),
        parse = d3.time.format("%m/%Y").parse,
        format = d3.time.format("%b");
    
    if (unit == undefined) { unit = "lanes"}
    var fixedDigits = 1;
    if (unit == "samples") { fixedDigits = 0; }
    
    /**
     * Not really using these colour schemes at the moment
     * Will leave the code in for my bad old memory, if they are to be
     * used later on
     */    
    // color scales
    // use colorbrewer color schemes
    // number of colors to use. NB! not all schemes have the same number of colors, see colorbrewer.js
    // Also, see colorbrewer2.org
    //var num_colors = 11; // also used in svg color code functions below
    //var color_scheme = colorbrewer.RdYlGn[num_colors]; // array of colors defined in colorbrewer.js
    var num_colors = 3; // also used in svg color code functions below
    var color_scheme = colorbrewer.Blues[num_colors]; // array of colors defined in colorbrewer.js
    //var num_colors = 20; // also used in svg color code functions below
    //var color_scheme = d3.scale.category20c(); // array of colors defined in d3.js
       
    //z = d3.scale.ordinal().range(["lightpink", "darkgray", "lightblue"]);
    //var z = d3.scale.ordinal().range(colorbrewer.PuBu[3]);
    var z = d3.scale.ordinal().range(color_scheme); // this takes an array of colors as argument
    
    var svg = d3.select("#" + divID).append("svg:svg")
        .attr("width", w)
        .attr("height", h)
      .append("svg:g")
        .attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");
    
        
        // Compute the x-domain (by platform) and y-domain (by top).
        x.domain(dataset[0].map(function(d) { return d.x; }));
        y.domain([0, d3.max(dataset[dataset.length - 1], function(d) { return d.y0 + d.y; })]);
    
        // Add a group for each project.
        var project = svg.selectAll("g.project")
            //.data(projLayers)
            .data(dataset)
          .enter().append("svg:g")
            .attr("class", "project")
            .style("fill", function(d, i) {
                //return z(i%num_colors); // make sure the chosen colorbrewer color space has num_colors defined
                //return z(1); // make sure the chosen colorbrewer color space has num_colors defined
                //return color_scheme(i%num_colors);
                var col = d3.rgb("#5B87FF");
                if(i%2 == 0) { return col.brighter(); }
                return col;
                //return d3.rgb("#5B87FF").brighter();
            }) 
            //.style("fill", "#5B87FF")
            .style("stroke", function(d, i) {
                //return d3.rgb(z(i%num_colors)).darker();
                //return d3.rgb(z(i%num_colors));
                //return "black";
                return "white";
            })
            ;
    
        // Add a rect for each date.
        var rect = project.selectAll("rect")
            .data(Object)
          .enter().append("svg:rect")
            .attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return -y(d.y0) - y(d.y); })
            .attr("height", function(d) { return y(d.y); })
            .attr("width", x.rangeBand())
            .style("stroke-width", function(d, i) {
                if(d.y == 0) { return "0"; }
                return "1px";
            })
            // begin copied code
            .on("mouseover", function(d) {
                 //d3.select(this)
                 //  //.attr("r", 7)
                 //  .attr("fill", "blue")
                 //  ;
                 var xPosition = x(d.x) + 10;
                 var yPosition = -y(d.y0) - y(d.y)/2; // position for offset value (y0) + half hight of layer
                 var num_lanes = d.y;
                 //Create the tooltip label
                 svg.append("text")
                   .attr("id", "tooltipA")
                   .attr("x", xPosition)
                   .attr("y", yPosition)
                 .text(d.pid)
                 ;
                 svg.append("text")
                   .attr("id", "tooltipB")
                   .attr("x", xPosition)
                   .attr("y", yPosition + 13)
                 .text(parseFloat(d.y).toFixed(fixedDigits) + " " + unit)
                 ;
            })
            .on("mouseout", function(d) { //Remove the tooltip
                   d3.select("#tooltipA").remove();
                    d3.select("#tooltipB").remove();
                    //d3.select("#tooltip3").remove();
            })
            .on("click", function(d) {
                     var projID = d.pid;
                     var url = "http://genomics-status.scilifelab.se/projects/" + projID;
                     window.open(url, "genomics-status");
            })
            ;
        
        //console.log(x.domain());
        // Add a label per category.
        var label = svg.selectAll("text")
            .data(x.domain())
          .enter().append("svg:text")
            .attr("x", function(d) { return x(d) + x.rangeBand() / 2; })
            .attr("y", 6)
            .attr("text-anchor", "middle")
            .attr("dy", ".71em")
            .text(function(d) { return d; })
            ;
        
        
        var tmp = x.domain();
        //console.log(tmp);
        var num_projects = numProjects(dataset, tmp);
        var num_units = numUnits(dataset, tmp, unit);
        var totals = totalY(dataset, tmp);
        
        var loadText = svg.selectAll("g.load_label")
            .data(x.domain())
            .enter().append("svg:text")
            .attr("class", ".load_label")
            .attr("x", function(d) { return x(d) + x.rangeBand() / 2; })
           .attr("y", function(d) { return -y(totals[d]) - 5; })
            .attr("text-anchor", "middle")
            //.attr("dy", ".71em")
            .text(function(d) {
                var t = num_projects[d] + " proj";
                return t;                
            })
            ;        
        if (unit == "samples"){
            var loadText2 = svg.selectAll("g.load_label")
                .data(x.domain())
                .enter().append("svg:text")
                .attr("class", ".load_label")
                .attr("x", function(d) { return x(d) + x.rangeBand() / 2; })
                //.attr("y", function(d) { return -y(d.y0) - 10; })
                //.attr("y", function(d) { return -100; })
                .attr("y", function(d) { return -y(totals[d]) - 15; })
                .attr("text-anchor", "middle")
                //.attr("dy", ".71em")
                //.text(function(d) { return d; })
                .text(function(d) {
                    var t = num_units[d] + " WS";
                    return t;                
                })
                ;        
        }
        
        // Add y-axis rules.
        var rule = svg.selectAll("g.rule")
            .data(y.ticks(5))
          .enter().append("svg:g")
            .attr("class", "rule")
            .attr("transform", function(d) { return "translate(0," + -y(d) + ")"; });
        
        // horizontal lines. Add?
        //rule.append("svg:line")
        //    .attr("x2", w - p[1] - p[3])
        //    .style("stroke", function(d) { return d ? "#fff" : "#000"; })
        //    .style("stroke-opacity", function(d) { return d ? .7 : null; });
        
        rule.append("svg:text")
            //.attr("x", w - p[1] - p[3] + 6)
            .attr("text-anchor", "end")
            .attr("x", -p[3] + 18)
            .attr("dy", ".35em")
            .text(d3.format(",d"))
            ;
    
            
    //});
    
}

function numProjects(dataset, domain) {
    var num_projects = {};
    for (var i = 0; i < domain.length; i++) {
        num_projects[domain[i]] = 0;
    }
    //console.log(num_projects);
    for(var i = 0; i < dataset.length; i++) {
        for (var j = 0; j < dataset[i].length; j++) {
            var obj = dataset[i][j];
            if(obj.y != 0) { num_projects[obj.x]++; }
        }
    }
    //console.log(num_projects);
    return num_projects;
}

function numUnits(dataset, domain, unit) {
    var num_u = {};
    for (var i = 0; i < domain.length; i++) {
        num_u[domain[i]] = 0;
    }
    //console.log(num_u);
    for(var i = 0; i < dataset.length; i++) {
        for (var j = 0; j < dataset[i].length; j++) {
            var obj = dataset[i][j];
            if(obj.y != 0) { num_u[obj.x] += obj.y; }
        }
    }
    for (c in num_u) {
        if (unit == "samples") { // convert samples to worksets
            if (num_u[c] != 0) {
                num_u[c] = Math.ceil(num_u[c]/96);
            }
        } else { // round off lane counts to one digit
            num_u[c] = parseFloat(num_u[c]).toFixed(1);
        }
        
    }
    //console.log(num_u);
    return num_u;
}
function totalY(dataset, domain) {
    var tot = {};
    for (var i = 0; i < domain.length; i++) {
        tot[domain[i]] = 0;
    }
    //console.log(num_projects);
    for(var i = 0; i < dataset.length; i++) {
        for (var j = 0; j < dataset[i].length; j++) {
            var obj = dataset[i][j];
            tot[obj.x] += obj.y;
        }
    }
    //console.log(tot);
    return tot;
}
