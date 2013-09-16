var day = 1000*60*60*24;

// date2 - date1 in days
function daydiff(date1, date2) { 
        var diff = Math.ceil((date2.getTime()-date1.getTime())/(day));
        return diff;				
}

function dateValueSort(a, b){
        var datediff = a[2] - b[2];
        if (datediff == 0) {
            return b[1] - a[1]; // longer del times sorted before shorter
        } else {
            return datediff;
        }
}

/**
 * Generates a dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array of date-times-project as arrays. Times are in days
 */
function generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) {
        var dataArray = [];
        var rows = jsonview["rows"];
        
        //var j = 0; // counter for data points that make it into the data array NOT USED
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var k = rows[i]["key"];
            if(filter) {
                if(!inverseSelection) {
                    if(k[0] != null && k[0].indexOf(filter) == -1 ) { continue; } // Data structure is [application || seq platform, project name].                     
                } else {
                    if(k[0] == null || k[0].indexOf(filter) != -1 ) { continue; }
                }
            }
            var dates = rows[i]["value"];
            var finishedDate = new Date(dates[dateToKey]);            
            //console.log("finished date: " + dates[endKey] + " -> " + finishedDate);
            
            // Handle special case were application = "Finished library" & process step = Seq: change dateFromKey: "QC library finished" -> "Queue date"
            if(k[0] != null && k[0].indexOf("Finished library") != -1 && dateFromKey == "QC library finished") {
                dateFromKey = "Queue date";
            }
            if (finishedDate >= dateRangeStart && finishedDate <= dateRangeEnd) {
                if (dates[dateFromKey] != "0000-00-00") {
                    var startDate = new Date(dates[dateFromKey]);
                    var totalQF = daydiff(startDate, finishedDate);
                    //console.log("finished date: " + finishedDate + ", totalQF: " + totalQF);
                    
                    //dataArray.push([ totalQF, k[1], finishedDate ]); /*  timediff, Project name, finished date*/
                    dataArray.push([ totalQF, k[1], finishedDate, k[2] ]);  /*  Testing for link out to genomics-status: timediff, Project name, finished date, Project Id*/
                }
                
            }
        }
        dataArray.sort(dateValueSort);
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
        }
        return dataArray;
        
}

/**
 * Generates a dataset for box plot from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {String} dateToKey	A key to identify end date for diff calculation
 * @param {String} filter	    A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array of date-times-project as arrays. Times are in days !!!! NOT CORRECT, FIX!!!!
 */
function generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) {
        var dataArray = [];
        dataArray[0] = [];
        var rows = jsonview["rows"];
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var k = rows[i]["key"];
            if(filter) {
                if(!inverseSelection) {
                    if(k[0] != null && k[0].indexOf(filter) == -1 ) { continue; } // NOTE! Current data structure is [seq platform, project name]. Future should be different and code will have to be updated to handle both seq pf and library category                    
                } else {
                    if(k[0] == null || k[0].indexOf(filter) != -1 ) { continue; }
                }
            }
            //if(filter) {
            //    if(k[0].indexOf(filter) == -1 ) { continue; } // NOTE! Current data structure is [seq platform || application, project name].
            //}
            var dates = rows[i]["value"];
            var finishedDate = new Date(dates[dateToKey]);
            //console.log("finished date: " + dates[endKey] + " -> " + finishedDate);

            // Handle special case were application = "Finished library" & process step = Seq: change dateFromKey: "QC library finished" -> "Queue date"
            if(k[0] != null && k[0].indexOf("Finished library") != -1 && dateFromKey == "QC library finished") {
                dateFromKey = "Queue date";
            }

            if (finishedDate >= dateRangeStart && finishedDate <= dateRangeEnd) {
                if (dates[dateFromKey] != "0000-00-00") {
                    var queueDate = new Date(dates[dateFromKey]);
                    var totalQF = daydiff(queueDate, finishedDate);
                    //console.log("finished date: " + finishedDate + ", totalQF: " + totalQF);
                    dataArray[0].push(totalQF);
                }
                
            }
        }
        return dataArray;
}

// Returns a function to compute the interquartile range.
function iqr(k) {
  //return function(d, i) {
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
 * Generates a dataset for active projects bar chart from a couchdb view
 * @param {Object} jsonview		A parsed json stream (key has to be in the form [application, project_name])
 * @param {Date} cmpDate	A Date object to specify the date to generate data for 
 * @returns {Array} 			An array of step-#projects as step-value objects.
 */
function generateBarchartDataset (jsonview, cmpDate) {
    //console.log(jsonview);
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    
    // Key strings in indata
    var arrivalKey = "Arrival date";
    var queueKey = "Queue date";
    var libQCKey = "QC library finished";
    var allSeqKey = "All samples sequenced";
    //var finishedKey = "Finished date";

    /**
     * Rec ctrl		=	arrivalKey to queueKey
     * Lib prep 	= 	queueKey to libQCKey
     * Seq 			= 	libQCKey to allSeqKey
     * Raw data QC	=	allSeqKey to finishedKey NOTE! NOT USED AT THE MOMENT
     */

    var recCtrl = { key: "Rec ctrl", value: 0 };					
    var libPrep = { key: "Lib prep", value: 0 };					
    var seq = { key: "Seq", value: 0 };
    //var rawDataQC = { step: "Raw data QC", value: 0 };

    //var dataArray = [recCtrl, libPrep, seq, rawDataQC];
    var dataArray = [recCtrl, libPrep, seq];


    var rows = jsonview["rows"];
    //var j = 0; // counter for data points that make it into the data array NOT USED
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var libPrepProj = false;
        if(k[0] != null && k[0].indexOf("Finished library") == -1 )  { libPrepProj = true; }  

        var dates = rows[i]["value"];

        //var arrivalDate = new Date(dates[arrivalKey]);
        //var queueDate = new Date(dates[queueKey]);
        //var libQCDate = new Date(dates[libQCKey]);
        //var allSeqDate = new Date(dates[allSeqKey]);
        ////var finishedDate = new Date(dates[finishedKey]);

        var arrivalDate = dates[arrivalKey];
        var queueDate = dates[queueKey];
        var libQCDate = dates[libQCKey];
        var allSeqDate = dates[allSeqKey];
        //var finishedDate = new Date(dates[finishedKey]);
        
        //console.log("in rows");
                
        var step;
        if ((arrivalDate > cmpDateStr) || (arrivalDate == "0000-00-00") ) {
            console.log(cmpDateStr + " Skipping " + arrivalDate);
            continue;
        } // proj w arrival date before cmp date
        if ( (queueDate == "0000-00-00") || cmpDateStr < queueDate) { 
            if (allSeqDate != "0000-00-00" && cmpDateStr > allSeqDate) { // to handle data without a queue date but where seq is finished
                step = "no step";
            } else {
                recCtrl.value++;
                step = "rec ctrl";
            }
        } else if (libPrepProj && (libQCDate == "0000-00-00" || cmpDateStr < libQCDate) ) { // ignore libQCDate for finished lib projects
        //} else if (libPrepProj  ) { // just testing
            libPrep.value++;
            step = "lib prep";
        } else if (allSeqDate == "0000-00-00" || cmpDateStr < allSeqDate) {
            seq.value++;
            step = "seq";
        } else {
            step = "no step";
        }                        
        
        //console.log("LibPrep: " + libPrepProj + ", cmpDate: " + cmpDateStr + ", key: " + k + ", dates: " + [arrivalDate, queueDate, libQCDate, allSeqDate] + ", step: " + step);
        //console.log(dataArray);
        
    }
    return dataArray;
    
}

/**
 * Generates a dataset for customer demand bar chart from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} cmpDate	A Date object to specify the date to generate data for 
 * @returns {Array} 			An array of step-#projects as step-value objects.
 */
function generateDemandDataset (jsonview, cmpDate) {
    // Key strings in indata
    var arrivalKey = "Arrival date";
    //var queueKey = "Queue date";
    //var libQCKey = "QC library finished";
    //var allSeqKey = "All samples sequenced";
    //var finishedKey = "Finished date";

    var dateFormat = d3.time.format("%Y-%m-%d");

    var week12Date = new Date(cmpDate - 12 * 7 * day);
    var week8Date = new Date(cmpDate - 8 * 7 * day);
    var week4Date = new Date(cmpDate - 4 * 7 * day);
    
    //var twelve = { key: "12", value: 0 };					
    //var eight = { key: "8", value: 0 };					
    //var four = { key: "4", value: 0 };
    var twelve = { key: dateFormat(week12Date) + " - " + dateFormat(new Date(week8Date - day)), value: 0 };					
    var eight = { key: dateFormat(week8Date) + " - " + dateFormat(new Date(week4Date - day)), value: 0 };					
    var four = { key: dateFormat(week4Date) + " - " + dateFormat(cmpDate), value: 0 };

    //var dataArray = [recCtrl, libPrep, seq, rawDataQC];
    var dataArray = [twelve, eight, four];
    

    var rows = jsonview["rows"];
    //var j = 0; // counter for data points that make it into the data array NOT USED
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var dates = rows[i]["value"];
        var arrivalDate = new Date(dates[arrivalKey]);
        //var queueDate = new Date(dates[queueKey]);
        //var libQCDate = new Date(dates[libQCKey]);
        //var allSeqDate = new Date(dates[allSeqKey]);
        //var finishedDate = new Date(dates[finishedKey]);
        
        //console.log("in rows");
        //if ((arrivalDate > cmpDate) || (finishedDate < cmpDate)) {
        if ((arrivalDate > cmpDate) || (arrivalDate < week12Date)) {
            continue;
        }
        if (arrivalDate < week8Date) {
            twelve.value++;
            //console.log("cmpdate: " + cmpDate + "queueDate: " + queueDate);
        } else if (arrivalDate < week4Date) {
            eight.value++;
            //console.log("cmpdate: " + cmpDate + "libQCDate: " + libQCDate);
        } else if (arrivalDate <= cmpDate) {
            four.value++;
            //console.log("cmpdate: " + cmpDate + "allSeqDate: " + allSeqDate);
        //} else if (cmpDate < finishedDate) {
        //    rawDataQC.value++;
        //    //console.log("cmpdate: " + cmpDate + "finishedDate: " + finishedDate);
        }
        //console.log(dataArray);
    }
    // calculate weekly averages
    four.value /= 4;
    eight.value /= 4;
    twelve.value /= 4;
    
    return dataArray;
    
}


/**
 * Code to draw the run chart plot
 * @param dataset  Parsed json object
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} clines Array of numbers representing where x week control lines should be drawn, e.g.[6, 10]
 * @param width plot width
 * @param height plot height
 * @param (padding) plot padding
 * @param (maxY) Optional. Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawRunChart(dataset, divID, clines, width, height, padding, maxY) {
    // Set default padding
    if(padding === undefined) {
        padding = 30;
    }
    // DOM id for svg object
    var svgID = divID + "SVG";
    
    // DOM id for data line
    var dataLineID = divID + "data_line";
    
    //console.log("svgID: " + svgID);
    //console.log("dataLineID: " + dataLineID);
    
    // Time format
    var dateFormat = d3.time.format("%Y-%m-%d");

    
    //Create scale functions
    if(maxY == undefined) {
        maxY = d3.max(dataset, function(d) { return d[1]; });
    }
    var xScale = d3.scale.linear()
            .domain([0, dataset.length])
            .range([padding, width - padding * 2]);
    
    var yScale = d3.scale.linear()
            //.domain([0, d3.max(dataset, function(d) { return d[1]; })])
            .domain([0, maxY])
            .range([height - padding, padding]);

    //Define X axis
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .ticks(5);
    
    //Define Y axis
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(5);
    
    // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    //if (svgID == "total_rcSVG") {
    //    console.log("selectd svg");
    //    console.log(svg[0][0]);        
    //}
    var newchart = false;
    //if(svg == undefined) {
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("id", svgID);
        //console.log("appended svg:")
        //console.log(typeof(svg[0][0]));        
    }


    // remove old circles and lines if updating chart
    if(!newchart) { 
        var circles = svg.selectAll("circle");
        circles.remove();
        var l = svg.select("#" + dataLineID); 
        l.remove();
    }
    //Create circles
    svg.selectAll("circle")
       .data(dataset)
       .enter()
       .append("circle")
       .attr("cx", function(d) {
            return xScale(d[0]);
       })
       .attr("cy", function(d) {
            return yScale(d[1]);
       })
       .attr("r", 4)
       .on("mouseover", function(d) {
            d3.select(this)
              .attr("r", 7)
              .attr("fill", "blue")
              ;
            var xPosition = xScale(d[0]) + 10;
            var yPosition = yScale(d[1]);
            //Create the tooltip label
            svg.append("text")
              .attr("id", "tooltip1")
              .attr("x", xPosition)
              .attr("y", yPosition)
            .text(d[2])
            ;
            svg.append("text")
              .attr("id", "tooltip2")
              .attr("x", xPosition)
              .attr("y", yPosition + 13)
            .text(dateFormat(d[3]))
            ;
            svg.append("text")
              .attr("id", "tooltip3")
              .attr("x", xPosition)
              .attr("y", yPosition + 26)
            .text(d[1] + " days")
            ;	

       })
       .on("mouseout", function(d) { //Remove the tooltip
            d3.select(this)
              .attr("r", 4)
              .attr("fill", "black")
              ;
               d3.select("#tooltip1").remove();
               d3.select("#tooltip2").remove();
               d3.select("#tooltip3").remove();
       })
       .on("click", function(d) {
                var projID = d[4];
                var url = "http://genomics-status.scilifelab.se/projects/" + projID;
                window.open(url, "genomics-status");
       })
    ;
    // Add line (needs sorted array for lines to make sense)
    var line = d3.svg.line()
        .x(function(d) { return xScale(d[0]); })
        .y(function(d) { return yScale(d[1]); });
    
    svg.append("path")
          .attr("class", "line")
          .attr("d", line(dataset))
          .attr("id", dataLineID); 

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
    if(newchart) {
        // y axis label
        svg.append("text")
            //.attr("transform", "rotate(-90)")
            .attr("y", padding - 10 )
            .attr("x", padding)
            .attr("class", "axis_label")
            .text("days");
        // x axis label
        svg.append("text")
            //.attr("transform", "rotate(-90)")
            .attr("y", height - 20)
            .attr("x", width)
            .attr("class", "axis_label")
            .text("# projects");
        
    }
    
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
 * @param dataset  Parsed data
 * @param {String} divID Id of DOM div to where plot should reside
 * @param plotHeight plot height
 */
function drawBoxPlot(dataset, divID, plotHeight, maxY) {
    var margin = {top: 30, right: 50, bottom: 30, left: 50},
        width = 120 - margin.left - margin.right,
        //height = 450 - margin.top - margin.bottom;
        //height = 400 - margin.top - margin.bottom;
        height = plotHeight - margin.top - margin.bottom;
    // DOM id for svg object

    var svgID = divID + "SVG";
    //console.log("svgID: " + svgID);
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
    //console.log("min: " + min + ", max: " + max);
    chart.domain([min, max]);


        // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    //if (divID == "total_bp") {
    //    console.log("selected svg in boxplot");
    //    console.log(svg);
    //    console.log(svg[0][0]);
    //    
    //}
    var newchart = false;
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID).selectAll("svg")
            .data(dataset)
            .enter().append("svg")
            .attr("class", "box")
            .attr("id", svgID)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(chart)
            ;
        //console.log("appended svg:")
        //console.log(typeof(svg[0][0]));        
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
 * Code to draw barchart plot
 * @param {Object} dataset Parsed json dataset
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} labels Array of labels, e.g.["Rec ctrl", "Lib prep", "Seq"]
 * @param width plot width
 * @param height plot height
 * @param padding plot padding
 * @param (maxY) Optional. Max value of y axis. To be able to draw different panels on the same scale 
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
    
    //Create labels
    svg.selectAll("text")
       .data(dataset, key)		//Bind data with custom key function
       .enter()
       .append("text")
       .text(function(d) {
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
 * @param appl_json  Parsed json object for the "application_data"
 * @param pf_json  Parsed json object for the "platform_data"
 * @param {Date} plotDate Date for which to draw data
 * @param {Date} startDate Date to start from
 * @param height panel plot height
 * @param rc_width runchart plot widths
 */
//function drawProcessPanels(appl_json, plotDate, startDate, height, rc_width){
function drawProcessPanels(appl_json, pf_json, plotDate, startDate, height, rc_width){
    // keys for total time calculation
    var startKey = "Queue date";
    var endKey = "All samples sequenced";
    
    var demandDataset = generateDemandDataset(appl_json, plotDate);
    var ongoingDataset = generateBarchartDataset(appl_json, plotDate);
    //console.log(demandDataset);
    var maxD = d3.max(demandDataset, function(d) { return d.value });
    var maxO = d3.max(ongoingDataset, function(d) { return d.value });
    
    var maxY = Math.max(maxD, maxO);
    
    drawBarchartPlot(demandDataset, "demand_bc", 500, height, 30, maxY);
    drawBarchartPlot(ongoingDataset, "ongoing_bc", 500, height, 30, maxY);
    
    //console.log(pf_json);
    var totalRcDataset = generateRunchartDataset(appl_json, startDate, plotDate, startKey, endKey);
    //console.log(totalRcDataset);
    drawRunChart(totalRcDataset, "total_rc", [6, 10], rc_width, height, 30);
    var totalBpDataset = generateBoxDataset(appl_json, startDate, plotDate, startKey, endKey);
    //console.log(totalBpDataset);
    drawBoxPlot(totalBpDataset, "total_bp", height);
    
    /** Step time datasets for all projects */
    var recCtrlDataset = generateRunchartDataset(appl_json, startDate, plotDate, "Arrival date", "Queue date");
    var libPrepDataset = generateRunchartDataset(appl_json, startDate, plotDate, "Queue date", "QC library finished", "Finished library", true); 
    /** Something wrong with seq data set, same as total delivery times*/
    //var seqDataset = generateRunchartDataset(appl_json, startDate, plotDate, "QC library finished", "All samples sequenced"); 
    var seqDataset = generateRunchartDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced"); 
    
    // get highest value in these data sets to set a common scale
    var maxRC = d3.max(recCtrlDataset, function(d) {return d[1];});
    var maxLP = d3.max(libPrepDataset, function(d) {return d[1];});
    var maxSeq = d3.max(seqDataset, function(d) {return d[1];});
    maxStepY = Math.max(maxRC, maxLP, maxSeq)

    drawRunChart(recCtrlDataset, "rec_ctrl_rc", [2], rc_width, height, 30, maxStepY);
    var recCtrlBpDataset = generateBoxDataset(appl_json, startDate, plotDate, "Arrival date", "Queue date");
    drawBoxPlot(recCtrlBpDataset, "rec_ctrl_bp", height, maxStepY);
    
    drawRunChart(libPrepDataset, "lib_prep_rc", [3], rc_width, height, 30, maxStepY);
    var libPrepBpDataset = generateBoxDataset(appl_json, startDate, plotDate, "Queue date", "QC library finished", "Finished library", true);
    drawBoxPlot(libPrepBpDataset, "lib_prep_bp", height, maxStepY);
    
    drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    var seqBpDataset = generateBoxDataset(appl_json, startDate, plotDate, "QC library finished", "All samples sequenced");
    drawBoxPlot(seqBpDataset, "seq_bp", height, maxStepY);
    
    // total times subsets
    // LibPrep, Finished lib run chart datasets
    var totalRcLPDataset = generateRunchartDataset(appl_json, startDate, plotDate, startKey, endKey, "Finished library", true);
    var totalRcFLDataset = generateRunchartDataset(appl_json, startDate, plotDate, startKey, endKey, "Finished library");   
    //// MiSeq, HiSeq run chart datasets
    var totalRcMiSeqDataset = generateRunchartDataset(pf_json, startDate, plotDate, startKey, endKey, "MiSeq");
    var totalRcHiSeqDataset = generateRunchartDataset(pf_json, startDate, plotDate, startKey, endKey, "HiSeq");
    // LibPrep, Finished lib boxplot datasets
    var totalBpLPDataset = generateBoxDataset(appl_json, startDate, plotDate, startKey, endKey, "Finished library", true);
    var totalBpFLDataset = generateBoxDataset(appl_json, startDate, plotDate, startKey, endKey, "Finished library");
    //// MiSeq, HiSeq boxplot datasets
    var totalBpMiSeqDataset = generateBoxDataset(pf_json, startDate, plotDate, startKey, endKey, "MiSeq");
    var totalBpHiSeqDataset = generateBoxDataset(pf_json, startDate, plotDate, startKey, endKey, "HiSeq");
    
    // Seq step times subsets
    //// MiSeq, HiSeq run chart datasets
    var seqMiSeqDataset = generateRunchartDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced", "MiSeq"); 
    var seqHiSeqDataset = generateRunchartDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced", "HiSeq"); 
    //// MiSeq, HiSeq boxplot datasets
    var seqBpMiSeqDataset = generateBoxDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced", "MiSeq");
    var seqBpHiSeqDataset = generateBoxDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced", "HiSeq");

    //// just redraw once for testing
    //            drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 10], rc_width, height, 30);
    //            drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
    //            d3.select("#total_legend").text("Total delivery times - MiSeq projects");
    //            
    //            drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    //            drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
    //            d3.select("#seq_legend").text("Sequencing  delivery times - MiSeq projects");

    
    var setNo = 2;
    window.setInterval(function(){
        switch(setNo) {
            case 1:
                drawRunChart(totalRcDataset, "total_rc", [6, 10], rc_width, height, 30);
                drawBoxPlot(totalBpDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: default").text("All projects");
                
                drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: default").text("All projects");
                
                setNo++;
                break;
            case 2:
                drawRunChart(totalRcLPDataset, "total_rc", [6, 10], rc_width, height, 30);
                drawBoxPlot(totalBpLPDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Lib prep projects");
                setNo++;
                break;
            case 3:
                drawRunChart(totalRcFLDataset, "total_rc", [6, 10], rc_width, height, 30);
                drawBoxPlot(totalBpFLDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: green").text("Finished library projects");
                setNo++;
                //setNo = 1;
                break;
            case 4:
                drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 10], rc_width, height, 30);
                drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("MiSeq projects");
                
                drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: orange").text("MiSeq projects");
                setNo++;
                
                break;
            case 5:
                drawRunChart(totalRcHiSeqDataset, "total_rc", [6, 10], rc_width, height, 30);
                drawBoxPlot(totalBpHiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: green").text("HiSeq projects");
                
                drawRunChart(seqHiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpHiSeqDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: green").text("HiSeq projects");
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