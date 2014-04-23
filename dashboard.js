/*
 * Array of colours suited for time series colours etc
 */
var timeseriesColors = ["#5B87FF", "#FFC447", "#865BFF", "#FFE147"]; // colors for four series, add more?

/**
 * Calculates difference in days between two dates
 * @param {Date} date1	A Date object
 * @param {Date} date2	A Date object
 * @returns {Number} 	Difference in days between date2 and date1
 */
function daydiff(date1, date2) { 
        var day = 1000*60*60*24;
        var diff = Math.floor((date2.getTime()-date1.getTime())/(day));
        return diff;				
}

/**
 * Generates a function to compute the interquartile range. Used by drawBoxPlot for whisker length determination 
 * @param {Number} k	whisker limit factor for boxplot
 * @returns {Function}    Function to compute interquartile range based on k. 
 */
function iqr(k) {
  return function(d) {
    var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
    while (d[++i] < q1 - iqr);
    while (d[--j] > q3 + iqr);
    return [i, j];
  };
}

/**
 * Sorting function for runchart data sets
 * @param {Array} a	An array for a project: [pid, num_samples, doneDate, daysX, daysY, ...]
 * @param {Array} b	An array for a project: [pid, num_samples, doneDate, daysX, daysY, ...]
 * @returns {Number} 	negative values if a should be sorted before b, and positive values if vice versa
 */
function dateValueSort(a, b){
        var datediff = a[2] - b[2]; // Date done
        if (datediff == 0) {
            //return b[1] - a[1]; // longer del times sorted before shorter
            
            if (a[3] == b[3]) { // Delivery time
                if (a[0] < b[0]) { // Project ID, lower ID before higher
                    //console.log("a: " + a[3] + ", " + a[0] + ", " + a[2] + " / " + "b: " + b[3] + ", " + b[0] + ", " + b[2]);
                    return -1;
                } else {
                    //console.log("a: " + a[3] + ", " + a[0] + ", " + a[2] + " / " + "b: " + b[3] + ", " + b[0] + ", " + b[2]);
                    return 1;
                }
            }
            return b[3] - a[3]; // longer del times sorted before shorter
        } else {
            return datediff;
        }
}

/**
 * Sorting function for project data sets
 * @param {Object} a	A project object
 * @param {Array} b A project object
 * @returns {Number}	negative values if a should be sorted before b, and positive values if vice versa, otherwise 0
 */
function sortByQueueArrival (a, b) {
    var aV =  a["value"];
    var bV =  b["value"];
    var aQD = aV["Queue date"];
    var bQD = bV["Queue date"];
    var aAD = aV["Arrival date"];
    var bAD = bV["Arrival date"];
    var aPid = a["key"][0]; // project id
    var bPid = b["key"][0]; // project id
    //var aAppl = a["key"][2];
    //var bAppl = b["key"][2];
    if (aQD == "0000-00-00" && bQD == "0000-00-00") {
        return 0;
    }
    if(aQD < bQD) {
        if(aQD == "0000-00-00") {
            return 1;
        } // if no queue date yet => end of queue
        return -1;
    }
    if(aQD > bQD) {
        if(bQD == "0000-00-00") {
            return -1;
        } // if no queue date yet => end of queue
        return 1;
    }
    if(aAD < bAD) { return -1; }
    if(aAD > bAD) { return 1; }
    if(aPid < bPid) { return -1; }
    if(aPid > bPid) { return 1; }
    return 0;
    
}

// Look at calculating and adding a first in queue date. Is this the proper place to do this? On sample level instead?
/**
 * Reduces a json object at sample level from statusdb map-reduce view to project level
 * @param {Object} jsonview	json object of sample level data
 * @returns {Object} 	a reduced json object at project level, sorted on Queue date - Arrival date - proj ID
 */
function reduceToProject(jsonview) {
    var rows = jsonview["rows"];
    var projects = {};
    var prepStarts = {};
    
    // switches for debugging 
    var debug = false;
    var debugID = "P931";
    
    // Loop through all samples
    for (var i = 0; i < rows.length; i++) {
        var keys = rows[i]["key"];
        var values = rows[i]["value"];
        
        // skip aborted *projects*
        var aborted_date = values["Aborted date"];
        if (aborted_date != "0000-00-00") {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        
        
        // Handle aborted *samples*
        var aborted = (values["Status"] == "Aborted");
        
        var pid = keys[0]; // project id
        var type = keys[1]; // type = Production || Applications
        var appl = keys[2]; // application
        var pf = keys[3]; // platform
        var sid = keys[4]; // sample id
        // *** Need to handle start dates here even for aborted samples ****
        if(projects[pid] == undefined) { // new project, initialize with keys
            projects[pid] = {
                                "type": type,
                                "appl": appl,
                                "pf": pf,
                            }
            for (var valKey in values) {
                projects[pid][valKey] = values[valKey]; // intialize all data for proj with values of first sample. This is ok even if sample is aborted
                if (debug && pid == debugID) { console.log(sid + " " + valKey + ": " + values[valKey]); }
            }
        } else {
            // update data with appropriat date, or sum up lanes or samples
            for (var valKey in values) {
                var currVal = values[valKey];
                if (debug && pid == debugID) { console.log(sid + " " + valKey + ": " + values[valKey]); }
                
                if (valKey == "Lib prep start") { // capture prep start dates
                    if (prepStarts[currVal] == undefined) { // no data for this date, so initialize array
                        prepStarts[currVal] = [ ]; 
                    }
                    prepStarts[currVal].push( projects[pid]); // add project object   
                }
                // set values
                if(!aborted && valKey == "Samples" || valKey == "Lanes") {
                    projects[pid][valKey] += values[valKey];
                } else if (valKey.indexOf("start") != -1 && currVal != "0000-00-00") { // get earliest start dates
                    if (currVal < projects[pid][valKey]) { projects[pid][valKey] = currVal; } // handles 0000-00-00 as well
                } else if(!aborted){ // get latest done dates, except 0000-00-00
                    if (currVal == "0000-00-00" || projects[pid][valKey] == "0000-00-00") { // need to capture if date is already set to 0000-00-00
                        projects[pid][valKey] = "0000-00-00";
                    } else if (currVal > projects[pid][valKey]) {
                        projects[pid][valKey] = currVal;
                    }
                }
            }
        }
    }

    var outRows = [];
    
    // go through all projects and put in original structure
    for (var pid in projects) {
        var newKey = [
            pid,
            projects[pid]["type"],
            projects[pid]["appl"],
            projects[pid]["pf"]
        ];
        
        var newValue = {
            "Arrival date":projects[pid]["Arrival date"],
            "Rec ctrl start":projects[pid]["Rec ctrl start"],
            "Queue date":projects[pid]["Queue date"],
            "Lib prep start":projects[pid]["Lib prep start"],
            "QC library finished":projects[pid]["QC library finished"],
            "Sequencing start":projects[pid]["Sequencing start"],
            "All samples sequenced":projects[pid]["All samples sequenced"],
            "All raw data delivered":projects[pid]["All raw data delivered"],
            "Close date":projects[pid]["Close date"],
            "Samples":projects[pid]["Samples"],
            "Lanes":parseFloat(Math.round(projects[pid]["Lanes"]).toFixed(2))
        };
        
        var newRow = {
            "key": newKey,
            "value": newValue
        }
        outRows.push(newRow);
        // a bit of debugging code
        if (debug && pid == debugID) { console.log(newRow); }
    }
    
    // sort in queue order 
    outRows.sort(sortByQueueArrival);
    
    // get the prep start dates. Not used at the moment
    var prepStartsArr = [];
    for (var date in prepStarts) {
        if (date != "0000-00-00") {
            prepStartsArr.push(date);
        }
    }
    prepStartsArr.sort();
    
    return { "rows": outRows };
}

/**
 * Generates a dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {Boolean} onlyProduction	If true only include data where type == "Production"
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array [ order, pid, num_samples, date, daysX, daysY, ... ]. Times are in days
 */
function generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, onlyProduction, filter, inverseSelection) {
        var dataArray = [];
        var rows = jsonview["rows"];
        var projects = {};
        
        // Each row is one project
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var keys = rows[i]["key"];
            var values = rows[i]["value"];
            
            
            var pid = keys[0]; // project id
            var type = keys[1]; // type = Production || Applications
            var appl = keys[2]; // application
            var pf = keys[3]; // platform
            //var sid = keys[4]; // sample id
            if(onlyProduction && type != "Production") { continue; }
            
            
            if(filter) {
                var filter_field;
                if(filter.indexOf("library") != -1) {
                    filter_field = 2; // index for application in keys array
                } else if(filter.indexOf("iSeq") != -1) {
                    filter_field = 3; // index for platform in keys array
                }
                
                // more here... ?
                
                if(!inverseSelection) {
                    if(keys[filter_field] != null && keys[filter_field].indexOf(filter) == -1 ) { continue; }                     
                } else {
                    if(keys[filter_field] == null || keys[filter_field].indexOf(filter) != -1 ) { continue; }
                }
            }
            var sampleDateFrom = values[dateFromKey];
            var sampleDateTo = values[dateToKey];
            if(projects[pid] == undefined) {
                projects[pid] = {
                                    "type": type,
                                    "appl": appl,
                                    "pf": pf,
                                    "num_samples": 1,
                                    "fromDate": sampleDateFrom,
                                    "toDate": sampleDateTo,
                                    "daydiff": daydiff(new Date(sampleDateFrom), new Date(sampleDateTo))
                                }
            } else {
                if(sampleDateFrom < projects[pid]["fromDate"]) { projects[pid]["fromDate"] = sampleDateFrom; }
                if(sampleDateTo > projects[pid]["toDate"]) { projects[pid]["toDate"] = sampleDateTo; }
                projects[pid]["daydiff"] = daydiff(new Date(projects[pid]["fromDate"]), new Date(projects[pid]["toDate"]));
                projects[pid]["num_samples"]++;
            }
        }

        // out data structure: [ order, pid, num_samples, date, daysX, daysY, ... ]. Order is added after date sort
        for (var pid in projects) {
            // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
            if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }

            //// check if data is in scope
            //// within date range
            var toDate = new Date(projects[pid]["toDate"]);
            if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
            
            //// we find ourselves with a project that has a toDate within range, so write it to the output array
            dataArray.push([
                pid,
                projects[pid]["num_samples"],
                new Date(projects[pid]["toDate"]),
                projects[pid]["daydiff"]
            ]);
        }
        
        dataArray.sort(dateValueSort);    
        // add order number as first element in each array
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
                //console.log(tmpdata[4]); // project ID
        }
        return dataArray;
        
}

/**
 * Adds a time series to an existing dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Array} dataArray		An array of "project arrays" to which an extra time series shall be added
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {Boolean} onlyProduction	If true only include data where type == "Production"
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array [ order, pid, num_samples, date, daysX, daysY, ... ]. Times are in days
 */
function addToRunchartDataset (jsonview, dataArray, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, onlyProduction, filter, inverseSelection) {
        var rows = jsonview["rows"];
        var projects = {};

        //console.log(dateToKey);
        
        // Each row is one project
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var keys = rows[i]["key"];
            var values = rows[i]["value"];
            
            
            var pid = keys[0]; // project id
            var type = keys[1]; // type = Production || Applications
            var appl = keys[2]; // application
            var pf = keys[3]; // platform
            //var sid = keys[4]; // sample id
            if(onlyProduction && type != "Production") { continue; }
            
            
            if(filter) {
                var filter_field;
                if(filter.indexOf("library") != -1) {
                    filter_field = 2; // index for application in keys array
                } else if(filter.indexOf("iSeq") != -1) {
                    filter_field = 3; // index for platform in keys array
                }
                
                // more here... ?
                
                if(!inverseSelection) {
                    if(keys[filter_field] != null && keys[filter_field].indexOf(filter) == -1 ) { continue; }                     
                } else {
                    if(keys[filter_field] == null || keys[filter_field].indexOf(filter) != -1 ) { continue; }
                }
            }
            var sampleDateFrom = values[dateFromKey];
            var sampleDateTo = values[dateToKey];
            //console.log(pid + ": " + sampleDateTo);
            if(projects[pid] == undefined) {
                projects[pid] = {
                                    "type": type,
                                    "appl": appl,
                                    "pf": pf,
                                    "num_samples": 1,
                                    "fromDate": sampleDateFrom,
                                    "toDate": sampleDateTo,
                                    "daydiff": daydiff(new Date(sampleDateFrom), new Date(sampleDateTo))
                                }
            } else {
                if(sampleDateFrom < projects[pid]["fromDate"]) { projects[pid]["fromDate"] = sampleDateFrom; }
                if(sampleDateTo > projects[pid]["toDate"]) { projects[pid]["toDate"] = sampleDateTo; }
                projects[pid]["daydiff"] = daydiff(new Date(projects[pid]["fromDate"]), new Date(projects[pid]["toDate"]));
                projects[pid]["num_samples"]++;
            }
        }
        //console.log(projects);
        
        // out data structure: [ order, pid, num_samples, date, daysX, daysY, ... ]. Order is added after date sort
        //// THIS SHOULD GO AWAY
        //for (var pid in projects) {
        //    // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
        //    if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }
        //
        //    //// check if data is in scope
        //    //// within date range
        //    var toDate = new Date(projects[pid]["toDate"]);
        //    if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
        //    
        //    //// we find ourselves with a project that has a toDate within range, so write it to the output array
        //    dataArray.push([
        //        pid,
        //        projects[pid]["num_samples"],
        //        new Date(projects[pid]["toDate"]),
        //        projects[pid]["daydiff"]
        //    ]);
        //}
        
        for (var j = 0; j < dataArray.length; j++) {
            var tmpID = dataArray[j][1]; // pid
            var tmpDiff = projects[tmpID]["daydiff"];
            //console.log(tmpID + ": " + tmpDiff);
            dataArray[j].push(tmpDiff);
        }
        
        //// THIS IS NOT NEEDED
        //dataArray.sort(dateValueSort);    
        //// add order number as first element in each array
        //for (var j = 0; j < dataArray.length; j++) {
        //        var tmpdata = dataArray[j];
        //        tmpdata.unshift(j + 1);
        //        //console.log(tmpdata[4]); // project ID
        //}
        
        return dataArray;
        
}

/**
 * Generates a dataset for boxplots based on a specified index of the values
 * @param {Array} dataset		An array of arrays (the dataset used to generate the runchart)
 * @param {Number} index		index of the array that contains the value
 * @returns {Array} 			An array of arrays of values. 
 */
function generateGenericBoxDataset (dataset, index) {
        var dataArray = [];
        dataArray[0] = [];
        for (var i = 0; i<dataset.length; i++) {
            var value = dataset[i][index];
            if (isNaN(value)) { continue; }
            dataArray[0].push(value);
        }
        return dataArray;
}


// calculate # lanes started for sequencing. WORK IN PROGRESS
function calculateLanesStarted (json, startDate, cmpDate) {
    var jsonrows = json.rows;
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    var startDateStr = dateFormat(startDate);
    //console.log(startDateStr + " - " + cmpDateStr);
    
    var tot = { HiSeq: 0, MiSeq: 0, HiSeqSamples: 0, MiSeqSamples: 0 };
    for (var i=0; i<jsonrows.length; i++) {
        var seqStartDate = jsonrows[i]["value"]["Sequencing start"];
        var pf = jsonrows[i]["key"][3];
        if (pf != "MiSeq") {
            pf = "HiSeq";
        }
        if (seqStartDate >= startDateStr && seqStartDate <= cmpDateStr) {
            var lanes = jsonrows[i]["value"]["Lanes"];
            //console.log("lanes: " + lanes);
            tot[pf] += lanes;
            if(pf == "HiSeq") {
                tot["HiSeqSamples"]++;
            } else if (pf == "MiSeq") {
                tot["MiSeqSamples"]++;
            }
        }
    }
    tot.HiSeq = parseFloat(tot.HiSeq).toFixed(1);
    tot.MiSeq = parseFloat(tot.MiSeq).toFixed(1);
    return tot;
}
// calculate # lanes started for sequencing. WORK IN PROGRESS
function calculateWorksetsStarted (json, startDate, cmpDate) {
    var jsonrows = json.rows;
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    var startDateStr = dateFormat(startDate);
    //console.log(startDateStr + " - " + cmpDateStr);
    
    var tot = { DNA: 0, RNA: 0, SeqCap: 0, Other: 0 };
    for (var i=0; i<jsonrows.length; i++) {
        var prepStartDate = jsonrows[i]["value"]["Lib prep start"];
        var appl = jsonrows[i]["key"][2];
        
        //console.log(appl);

        var applCat = "";
        if(appl == null) {
            applCat = "Other";
        } else if (appl.indexOf("capture") != -1) {
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

        
        if (prepStartDate >= startDateStr && prepStartDate <= cmpDateStr) {
            tot[applCat]++;
        }
    }
    return tot;
}

/**
 * Code to draw the run chart plot
 * @param {Object} dataset  Parsed json object
 * @param {String} divID    Id of DOM div to where plot should reside
 * @param {Array} clines    Array of numbers representing where x week control lines should be drawn, e.g.[6, 10]
 * @param {Number} width    plot width
 * @param {Number} height   plot height
 * @param {Number} [padding=30] plot padding
 * @param {Number} [maxY] Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawRunChart(dataset, divID, clines, width, height, padding, maxY) {
    // Set default padding
    if(padding === undefined) {
        padding = 30;
    }
    // check how many time series there are in the data set
    var numSeries = dataset[0].length - 4; // There are four other pieces of information for each project
        
    // DOM id for svg object
    var svgID = divID + "SVG";
    
    // DOM id for data line
    var dataLineID = divID + "_data_line";
    
    var numProj = dataset.length;
    
    // Time format
    var dateFormat = d3.time.format("%Y-%m-%d");

    // Get a handle to the tooltip div & calculate appropriate size for mouseover
    var tooltipDiv = d3.select(".tooltip");
    var tooltipHeight = tooltipDiv.style("height");
    // remove last two letters: "px" & turn into an integer
    tooltipHeight = parseInt(tooltipHeight.substring(0, tooltipHeight.length - 2));
    var tooltipRowHeight = "13"; // 13px per row
    var extraTooltipRows = numSeries - 1; // add space for an extra row(s) if more than one time series
    var tooltipNewHeight = tooltipHeight + (extraTooltipRows * tooltipRowHeight);
    
    
    //Create scale functions
    if(maxY == undefined) {
        maxY = d3.max(dataset, function(d) { return d[4]; }); // This doesn't handle multiple time series...
    }
    var xScale = d3.scale.linear()
            .domain([0, dataset.length])
            .range([padding, width - padding * 0.5]);
    
    var yScale = d3.scale.linear()
            //.domain([0, d3.max(dataset, function(d) { return d[1]; })])
            .domain([0, maxY])
            .range([height - padding, padding]);

    //Define X axis
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .ticks(0);
    
    //Define Y axis
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(5);
    
    // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    var newchart = false;
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("id", svgID);

    }

    // remove old circles and lines if updating chart
    if(!newchart) { 
        var circlesToRemove = svg.selectAll("circle");
        circlesToRemove.remove();
        var linesToRemove = svg.selectAll(".line"); 
        linesToRemove.remove();
        
    }
    // Create circles
    // draw circles and lines for each time series
    var circleRadius = 3;
    var lines = [];
    var circles = svg.selectAll("circle")
           .data(dataset)
           .enter()
           ;
    for(var i=0; i < numSeries; i++) {
        var seriesIndex = i + 4;
        var color = timeseriesColors[i]; //timeseriesColors is a global array
        
        circles.append("circle")
           .attr("cx", function(d) {
                return xScale(d[0]);
           })
           .attr("cy", function(d) {
                //return yScale(d[4]);
                var cyPos = d[seriesIndex];
                if (isNaN(cyPos)) {
                    cyPos = -10;
                }
                return yScale(cyPos);
           })
           .attr("fill", color)
           .attr("r", circleRadius)
           .on("mouseover", function(d) {
                var timeString = "";
                for (j = 4; j < (numSeries + 4); j++) {
                    timeString += d[j] + " days<br/>";
                }
                d3.select(this)
                  .attr("r", circleRadius + 2)
                  ;
                // Make tooltip div visible and fill with appropriate text
                tooltipDiv.transition()		
                    .duration(200)		
                    .style("opacity", .9);		
                tooltipDiv.html(d[1] + "<br/>"
                                + dateFormat(d[3]) + "<br/>"
                                + timeString
                                )	
                    .style("left", (d3.event.pageX) + "px")		
                    .style("top", (d3.event.pageY - 28) + "px")
                    .style("height", (tooltipNewHeight + "px"))
                    ;	    
           })
           .on("mouseout", function(d) { //Remove the tooltip
                d3.select(this)
                  .attr("r", circleRadius)
                  ;
                // Make tooltip div invisible & reset height
                tooltipDiv.transition()		
                .duration(300)		
                .style("opacity", 0)
                .style("height", (tooltipHeight + "px"))
                ;
           })
           .on("click", function(d) {
                    var projID = d[1];
                    var url = "https://genomics-status.scilifelab.se/project/" + projID;
                    window.open(url, "genomics-status");
           })
        ;
        
        // Add line (needs sorted array for lines to make sense)        
        var line = d3.svg.line()
            .x(function(d) { return xScale(d[0]); })
            .y(function(d) {
                var y = d[seriesIndex];
                if (isNaN(y)) { // hack to handle missing data
                    y = -10;
                }
                return yScale(y);
            })
            ;           
        svg.append("path")
              .attr("class", "line")
              .attr("d", line(dataset))
              .attr("id", dataLineID + i);
              
    }
    
    // create or update axis   
    if(newchart){
        //Create X axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height - padding) + ")")
            .call(xAxis);
        //Create Y axis
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);
    } else {
        //Update X axis
        svg.select(".x.axis")
            .transition()
            .duration(1000)
            .call(xAxis);
        //Update Y axis
        svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(yAxis);       
    }
    // add axis labels
    //if(newchart) {
        // y axis label
        svg.append("text")
            .attr("y", padding - 10 )
            .attr("x", padding)
            .attr("class", "axis_label")
            .text("days");
        // x axis label
        if (!newchart) {
            var labelToRemove = svg.selectAll(".axis_label_x");
            labelToRemove.remove();
        }
        svg.append("text")
            .attr("y", height - 3)
            .attr("x", width)
            .attr("class", "axis_label_x")
            .text(numProj + " project");
        
    //}
    
    // define a straight line function for control lines
    var clLine = d3.svg.line()
        .x(function(d) { return xScale(d[0]); })
        .y(function(d) { return yScale(d[1]); });
    
    // add control lines
    for(var i = 0; i < clines.length; i++) {
        var sw = 3;
        if (i > 0) { sw = 1.5; }
        var lineY = clines[i] * 7;
        var lineID = "line_" + clines[i] + "_weeks";
        var labelText = clines[i] + " weeks";
        var labelOffset = 1;
        var labelY = lineY + labelOffset
        var labelID = "text_" + clines[i] + "_weeks";
        var xTPosition = xScale(0.1);
        var yTPosition = yScale(labelY);
        if (newchart) {
            svg.append("path")
                .attr("class", "ucl_line")
                .attr("id", lineID)
                .attr("stroke-width", sw)
                .attr("d", clLine(
                                   [[0, lineY], [dataset.length, lineY]]
                                   ))
                ;
            //Create the line label
            svg.append("text")
                .attr("class", "line_label")
                .attr("id", labelID)
                .attr("x", xTPosition)
                .attr("y", yTPosition)
            .text(labelText)
            ;        
        } else {
            svg.select("#" + lineID)
                .transition()
                .duration(1000)
                .attr("d", clLine(
                                [[0, lineY], [dataset.length, lineY]]
                            ))
                ;
            //Move the line label
            svg.select("#" + labelID)
                .transition()
                .duration(1000)
                .attr("x", xTPosition)
                .attr("y", yTPosition)
                ;
        }
    }
}


/**
 * Code to draw a boxplot
 * @param {Object} dataset  Parsed data
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Number} plotHeight plot height
 * @param {Number} [timeseries=1] the timeseries for which to draw the boxplot. Affects the color
 */
function drawBoxPlot(dataset, divID, plotHeight, maxY, bottom_margin, timeseries) {
    var margin = {top: 30, right: 20, bottom: 30, left: 20},
        width = 54 - margin.left - margin.right,
        //height = 450 - margin.top - margin.bottom;
        //height = 400 - margin.top - margin.bottom;
        height = plotHeight - margin.top - margin.bottom;
    // DOM id for svg object
    var svgID = divID + "SVG";
    //console.log("svgID: " + svgID);
    
    var boxClass = "box";
    if (timeseries == 2) {
        boxClass = "box2"; // affects which class and css used for graph elements
    }
    
    var min = Infinity,
        max = -Infinity;
    
    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);

    if (maxY == undefined) {
        max = d3.max(dataset[0]);        
    } else {
        max = maxY;
    }
    //min = d3.min(dataset[0]);
    min = 0;
    chart.domain([min, max]);


        // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    var newchart = false;
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID).selectAll("svg")
            .data(dataset)
            .enter().append("svg")
            .attr("class", boxClass)
            .attr("id", svgID)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(chart)
            ;
    } else {
        var g = d3.select("#" + divID)
            .selectAll("svg")
            .selectAll("g")
            .data(dataset)
            .transition() // doesn't work!
            .duration(1000)
            .call(chart)
            ;
        
    }

}


/**
 * Code to draw barchart plot. 
 * CURRENTLY ONLY USED FOR PROBLEM KPIS, THAT ARE NOT ACTIVE AT THE MOMENT
 * @param {Object} dataset Parsed json dataset
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} labels Array of labels, e.g.["Rec ctrl", "Lib prep", "Seq"]
 * @param {Number} width plot width
 * @param {Number} height plot height
 * @param {Number} [padding=30] plot padding
 * @param {Number} [maxY] Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawBarchartPlot(dataset, divID, width, height, bottom_padding, maxY) {
    var labels = [];
    for (var i = 0; i < dataset.length; i++) {
        labels.push(dataset[i].key);
    }
    
    if (maxY == undefined) {
        maxY = d3.max(dataset, function(d) {return d.value;});
    }
    var xScale = d3.scale.ordinal()
                    .domain(d3.range(dataset.length))
                    .rangeRoundBands([0, width], 0.05);
    
    var yScale = d3.scale.linear()
                    //.domain([0, d3.max(dataset, function(d) { return d.value; })])
                    .domain([0, maxY])
                    .range([0, height - bottom_padding]);
    
    //Define key function, to be used when binding data
    var key = function(d) {
        return d.key;
        //return d.step;
    };
    
    //Create SVG element
    //var svg = d3.select("#barchart")
    var svg = d3.select("#" + divID)
                .append("svg")
                .attr("width", width)
                .attr("height", height);
    
    //Create bars
    svg.selectAll("rect")
       .data(dataset, key)		//Bind data with custom key function
       .enter()
       .append("rect")
       .attr("x", function(d, i) {
            return xScale(i);
       })
       .attr("y", function(d) {
            return (height - bottom_padding) - yScale(d.value);
       })
       .attr("width", xScale.rangeBand())
       .attr("height", function(d) {
            return yScale(d.value);
       })
       //.attr("fill", function(d) {
       //     return "rgb(0, 0, " + (d.value * 10) + ")";
       //})
       ;
    
    var smallFormat = d3.format(".00r");
    //Create labels
    svg.selectAll("text")
       .data(dataset, key)		//Bind data with custom key function
       .enter()
       .append("text")
       .text(function(d) {
            if(d.value == 0) { return ""; }
            if(d.value < 1) { return smallFormat(d.value); }
            return d.value;
       })
       .attr("class", "bar_label")
       .attr("text-anchor", "middle")
       .attr("x", function(d, i) {
            return xScale(i) + xScale.rangeBand() / 2;
       })
       .attr("y", function(d) {
            //return (height - bottom_padding) - yScale(d.value) + 14;
            return (height - bottom_padding) - yScale(d.value) + 19;
       })
       ;
    // Check if there is info about total data set size, and if so add text to show that   
    var hasTotal = function(dSet) {
        for (var i = 0; i < dSet.length; i++) {
            if(dSet[i].total) { return true; }    
        }
        return false;
    }
    if(hasTotal(dataset)) {
        //console.log("We have total");
        //console.log(dataset);
        svg.selectAll("text")
           .data(dataset, key)		//Bind data with custom key function
           .enter()
           .append("text")
           .text(function(d) {
                //if(d.value < 1) { return smallFormat(d.value); }
                var totStr = "(" + d.total + ")";
                console.log("TotStr: " + totStr);
                return totStr;
           })
           .attr("class", "bar_label")
           .attr("text-anchor", "middle")
           .attr("x", function(d, i) {
                return xScale(i) + xScale.rangeBand() / 2;
           })
           .attr("y", function(d) {
                //return (height - bottom_padding) - yScale(d.value) + 14;
                return (height - bottom_padding) - yScale(d.value) + 19;
           })
           .attr("dy", 10)
           ;
        
    }
    //Define X axis
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .tickValues(labels)
                      ;
    //Create X axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - bottom_padding) + ")")
        .call(xAxis);
    
}

/**
 * Code to draw the all the process panels plots
 * @param {Object} sample_json  Parsed json object for all the sample data
 * @param {Date} plotDate Date for which to draw data
 * @param {Date} startDate Date to start from
 * @param {Number} height panel plot height
 * @param {Number} draw_width available drawing widths
 */
function drawProcessPanels(sample_json, plotDate, startDate, height, draw_width){
    // Reduce sample data to project level
    var reduced = reduceToProject(sample_json);
    
    // keys for time calculations
    var total = {
        startKey: "Queue date",
        endKey: "All samples sequenced" // Change to All raw data delivered when this works
    };
    var recCtrl = {
        startKey: "Arrival date",
        startKey2: "Rec ctrl start",
        endKey: "Queue date",
        endKey2: "Rec ctrl start"
    };
    var libPrep = {
        startKey: "Queue date",
        startKey2: "Lib prep start",
        endKey: "QC library finished"
    };
    var seq = {
        startKey: "QC library finished",
        startKey2: "Sequencing start",
        startKey3: "All samples sequenced", // start for bioinfo qc
        endKey: "All samples sequenced" // Change to All raw data delivered when this works
    };
    
    
    /* 
     *  17 bars to draw over the width of the window in the upper half
     */ 
    var bar_width = (draw_width + 320) / 17; 
    
    /* 
     *  4 run chart panels on the lower half
     */ 
    //var rc_width = draw_width / 4; // 
    var rc_width = draw_width / 4 - 20; // take away some width to fit in extra boxplots

    /* Upper half panels 
     ***********************************************************
    */
    
    ///////////////////
    // testing number of lanes and prep starts calculations. MOVE out of this function?
    var numLanes = calculateLanesStarted (sample_json, twelveWeeks, today);
    var numPreps = calculateWorksetsStarted (sample_json, twelveWeeks, today);
    //console.log(numLanes);
    //console.log(numPreps);    
    d3.select("#lane_starts").text(parseFloat(numLanes.HiSeq/12).toFixed(1) + " / " + parseFloat(numLanes.MiSeq/12).toFixed(1)
                                   + " (" + parseFloat(numLanes.HiSeqSamples/12).toFixed(1) + "/" + parseFloat(numLanes.MiSeqSamples/12).toFixed(1) + " samples)");
    d3.select("#prep_starts").text(parseFloat(numPreps.DNA /12).toFixed(2) + " / " + parseFloat(numLanes.RNA/12).toFixed(2)
                                   + " / " + parseFloat(numPreps.SeqCap/12).toFixed(2) + " / " + parseFloat(numPreps.Other/12).toFixed(2));
    ////////////////// end test bit
    
    /* Upper half panels - The ongoing calculations
     ***********************************************************
    */
        //Generate data sets
    var recCtrlLoad = generateRecCtrlStackDataset(sample_json, today);
    var sampleQueue = generateQueueSampleStackDataset(sample_json, today);
    var libprepLaneQueue = generateQueueLaneLPStackDataset(sample_json, today);
    var finlibLaneQueue = generateQueueLaneFLStackDataset(sample_json, today);
    var sampleLoadLibprep = generateLibprepSampleLoadDataset(sample_json, today);
    var laneLoadLibprep = generateLibprepLaneLoadDataset(sample_json, today);
    var seqLoad = generateSeqLoadDataset(sample_json, today);
    
    //console.log(sampleQueue);    

        //Set the 'normal' max values for the different load visualizations
    var rcNormalMax = 20; //# projects
    var queueLpSampleLoadNormalMax = 200; //# samples in queue for libprep
    var queueLpLaneLoadNormalMax = 60; //# lanes worth of samples in queue for libprep
    var queueFlLaneLoadNormalMax = 30; //# lanes of finished libraries in queue for sequencing
    var lpSampleLoadNormalMax = 200; //# samples in libprep
    var lpLaneLoadNormalMax = 60; //# lanes worth of samples in libprep
    var seqLaneLoadNormalMax = 100; //# lanes in sequencing
    
        //Draw the plots
    drawRCStackedBars(recCtrlLoad, "ongoing_bc_plot", bar_width * 1, panelHeights, rcNormalMax);
    drawStackedBars (sampleQueue, "queue_sample_load_lp", bar_width * 4, panelHeights, "samples", true, queueLpSampleLoadNormalMax, true);
    drawStackedBars (libprepLaneQueue, "queue_lane_load_lp", bar_width * 2, panelHeights, "lanes", false, queueLpLaneLoadNormalMax, false);
    drawStackedBars (finlibLaneQueue, "queue_lane_load_fl", bar_width * 2, panelHeights, "lanes", false, queueFlLaneLoadNormalMax, false);
    drawStackedBars(sampleLoadLibprep, "libprep_sample_load", bar_width * 4, panelHeights, "samples", false, lpSampleLoadNormalMax, false);
    drawStackedBars(laneLoadLibprep, "libprep_lane_load", bar_width * 2, panelHeights, "lanes", false, lpLaneLoadNormalMax, false);
    drawStackedBars (seqLoad, "seq_load_stack", bar_width * 2, panelHeights, "lanes", false, seqLaneLoadNormalMax, false);
    
        
    /* Lower half panels - Runcharts and boxplots
     ***********************************************************
    */
    
    /* **** Total delivery times data sets **** */
    var totalRcDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true);
    var totalBpDataset = generateGenericBoxDataset(totalRcDataset, 4);
        /* ** Subsets ** */
        // LibPrep projects
    var totalRcLPDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "Finished library", true);
    var totalBpLPDataset = generateGenericBoxDataset(totalRcLPDataset, 4);
        // Finished library projects
    var totalRcFLDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "Finished library");   
    var totalBpFLDataset = generateGenericBoxDataset(totalRcFLDataset, 4);
        // MiSeq projects
    var totalRcMiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "MiSeq");
    var totalBpMiSeqDataset = generateGenericBoxDataset(totalRcMiSeqDataset, 4);
        // HiSeq projects
    var totalRcHiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "HiSeq");
    var totalBpHiSeqDataset = generateGenericBoxDataset(totalRcHiSeqDataset, 4);
    

    /* **** RecCtrl delivery times data sets **** */
    var recCtrlDataset = generateRunchartDataset(reduced, startDate, plotDate, recCtrl.startKey, recCtrl.endKey, true);
    // add second time series
    recCtrlDataset = addToRunchartDataset(reduced, recCtrlDataset, startDate, plotDate, recCtrl.startKey2, recCtrl.endKey, true);
    var recCtrlBpDataset = generateGenericBoxDataset(recCtrlDataset, 4); // boxplot to use second time series
    var recCtrlBpDataset2 = generateGenericBoxDataset(recCtrlDataset, 5); // boxplot to use second time series

    /* **** Libprep delivery times data sets **** */
    var libPrepDataset = generateRunchartDataset(reduced, startDate, plotDate, libPrep.startKey, libPrep.endKey, true, "Finished library", true); 
    // add second time series
    libPrepDataset = addToRunchartDataset(reduced, libPrepDataset, startDate, plotDate, libPrep.startKey2, libPrep.endKey, true);
    var libPrepBpDataset = generateGenericBoxDataset(libPrepDataset, 4);
    var libPrepBpDataset2 = generateGenericBoxDataset(libPrepDataset, 5);
    
    /* **** Seq datasets for all projects **** */
    var seqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true); 
        // add second time series
    seqDataset = addToRunchartDataset(reduced, seqDataset, startDate, plotDate, seq.startKey2, seq.endKey, true);
    var seqBpDataset = generateGenericBoxDataset(seqDataset, 4);
    var seqBpDataset2 = generateGenericBoxDataset(seqDataset, 5);

        /* ** Subsets ** */
        // MiSeq projects
    var seqMiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true, "MiSeq"); 
            // add second time series
    seqMiSeqDataset = addToRunchartDataset(reduced, seqMiSeqDataset, startDate, plotDate, seq.startKey2, seq.endKey, true, "MiSeq");
    var seqBpMiSeqDataset = generateGenericBoxDataset(seqMiSeqDataset, 4);
    var seqBpMiSeqDataset2 = generateGenericBoxDataset(seqMiSeqDataset, 5);
        // HiSeq projects
    var seqHiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true, "HiSeq"); 
            // add second time series
    seqHiSeqDataset = addToRunchartDataset(reduced, seqHiSeqDataset, startDate, plotDate, seq.startKey2, seq.endKey, true, "HiSeq");
    var seqBpHiSeqDataset =generateGenericBoxDataset(seqHiSeqDataset, 4);
    var seqBpHiSeqDataset2 =generateGenericBoxDataset(seqHiSeqDataset, 5);

    
    // get highest value in the runchart data sets to set a common scale
    var maxTot = d3.max(totalRcDataset, function(d) {return d[4];});
    var maxRC = d3.max(recCtrlDataset, function(d) {return d[4];});
    var maxLP = d3.max(libPrepDataset, function(d) {return d[4];});
    var maxSeq = d3.max(seqDataset, function(d) {return d[4];});
    maxStepY = Math.max(maxTot, maxRC, maxLP, maxSeq)

    /* ***** Draw the panels with the first data **** */
    // Redrawing of subsets for total & seq times is done in the setInterval call below
    drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width + 10, height, 30);
    drawBoxPlot(totalBpDataset, "total_bp", height);
    
    drawRunChart(recCtrlDataset, "rec_ctrl_rc", [2], rc_width, height, 30, maxStepY);
    drawBoxPlot(recCtrlBpDataset, "rec_ctrl_bp1", height, maxStepY, 30, 1); // force css for class box1
    drawBoxPlot(recCtrlBpDataset2, "rec_ctrl_bp2", height, maxStepY, 30, 2); // force css for class box2
        
    drawRunChart(libPrepDataset, "lib_prep_rc", [2.5], rc_width, height, 30, maxStepY); 
    drawBoxPlot(libPrepBpDataset, "lib_prep_bp1", height, maxStepY, 30, 1); 
    drawBoxPlot(libPrepBpDataset2, "lib_prep_bp2", height, maxStepY, 30, 2); // force css for class box2
    
    drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    drawBoxPlot(seqBpDataset, "seq_bp1", height, maxStepY, 30, 1);
    drawBoxPlot(seqBpDataset2, "seq_bp2", height, maxStepY, 30, 2); // force css for class box2
    
    

    //// just redraw once for testing
    //            drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 10], rc_width, height, 30);
    //            drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
    //            d3.select("#total_legend").text("Total delivery times - MiSeq projects");
    //            
    //            drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    //            drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
    //            d3.select("#seq_legend").text("Sequencing  delivery times - MiSeq projects");

    /* **** Redraw with subsets at regular intervals **** */
    var setNo = 2;
    window.setInterval(function(){
        switch(setNo) {
            // Start state
            case 1:
                drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: default").text("All projects");
                
                drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpDataset, "seq_bp1", height, maxStepY);
                drawBoxPlot(seqBpDataset2, "seq_bp2", height, maxStepY, 30, 2);
                d3.select("#seq_legend").attr("style", "color: default").text("All projects");
                
                setNo++;
                break;
            // Libprep proj
            case 2:
                drawRunChart(totalRcLPDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpLPDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Lib prep projects");
                setNo++;
                break;
            // Finished lib proj
            case 3:
                drawRunChart(totalRcFLDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpFLDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Finished library projects");
                setNo++;
                //setNo = 1;
                break;
            // MiSeq proj
            case 4:
                drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("MiSeq projects");
                
                drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpMiSeqDataset, "seq_bp1", height, maxStepY);
                drawBoxPlot(seqBpMiSeqDataset2, "seq_bp2", height, maxStepY, 30, 2);
                d3.select("#seq_legend").attr("style", "color: orange").text("MiSeq projects");
                setNo++;
                
                break;
            // HiSeq proj
            case 5:
                drawRunChart(totalRcHiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpHiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("HiSeq projects");
                
                drawRunChart(seqHiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpHiSeqDataset, "seq_bp1", height, maxStepY);
                drawBoxPlot(seqBpHiSeqDataset2, "seq_bp2", height, maxStepY, 30, 2);
                d3.select("#seq_legend").attr("style", "color: orange").text("HiSeq projects");
                setNo = 1;
                
                break;
        }
    },
        //3000
        //9000
        20000
        //99999999
    );

}