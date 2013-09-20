/**
 * Generates a dataset for fraction of failed samples being progressed bar chart from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} cmpDate	A Date object to specify the date to generate data for 
 * @returns {Array} 			An array of time range-% failed samples as range-value objects.
 */
// couchdb view "KPI1" not yet ready fully ok
function generateFailedProgressedDataset (jsonview, cmpDate) {
    // Key strings in indata
    //var arrivalKey = "Arrival date";
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
    var twelve = {
        key: dateFormat(week12Date) + " - " + dateFormat(new Date(week8Date - day)),
        total: 0,
        failed: 0,
        value: 0 // This will hold the fraction of samples that have failed but still been progressed
    };					
    var eight = {
        key: dateFormat(week8Date) + " - " + dateFormat(new Date(week4Date - day)),
        total: 0,
        failed: 0,
        value: 0 // This will hold the fraction of samples that have failed but still been progressed
    };					
    var four = {
        key: dateFormat(week4Date) + " - " + dateFormat(cmpDate),
        total: 0,
        failed: 0,
        value: 0 // This will hold the fraction of samples that have failed but still been progressed
    };

    //var dataArray = [recCtrl, libPrep, seq, rawDataQC];
    var dataArray = [twelve, eight, four];
    

    var rows = jsonview["rows"];
    //var j = 0; // counter for data points that make it into the data array NOT USED
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var openDate = new Date(k[0]);
        var failed = rows[i]["value"] == "False";
        
        //console.log("in rows");
        //if ((arrivalDate > cmpDate) || (finishedDate < cmpDate)) {
        if ((openDate > cmpDate) || (openDate < week12Date)) {
            continue;
        }
        if (openDate < week8Date) {
            twelve.total++;
            if(failed) { twelve.failed++; }
            //console.log("cmpdate: " + cmpDate + "queueDate: " + queueDate);
        } else if (openDate < week4Date) {
            eight.total++;
            if(failed) { eight.failed++; }
            //console.log("cmpdate: " + cmpDate + "libQCDate: " + libQCDate);
        } else if (openDate <= cmpDate) {
            four.total++;
            if(failed) { four.failed++; }
            //console.log("cmpdate: " + cmpDate + "allSeqDate: " + allSeqDate);
        }
        //console.log(dataArray);
    }
    // calculate fractions
    four.value = four.failed / four.total;
    eight.value = eight.failed / eight.total;
    twelve.value = twelve.failed / twelve.total;
    
    return dataArray;
    
}

/**
 * Generates a dataset for fraction failed libprep samples/workset runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} filter	A key to identify records to be selected (application)
 * @returns {Array} 			An array of date-fail fraction-workset as arrays. 
 */
function generateWorksetFailureDataset (jsonview, dateRangeStart, dateRangeEnd, filter) {
        var dataArray = [];
        var rows = jsonview["rows"];
        
        var currWS = "";
        var numSamples = 0;
        var numFailed = 0;
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            //var k = rows[i]["key"];
            var keys = rows[i]["key"];
            
            if(filter != undefined) {
                var applCat = "DNA";
                var appl = keys[1];
                //console.log("appl: " + appl )
                if(appl.indexOf("RNA") != -1) {
                    applCat = "RNA";
                } else if (appl.indexOf("capture") != -1) {
                    applCat = "SeqCap";
                }
                //console.log("appl: " + appl + ", applCat: " + applCat );
                if(applCat != filter) { continue; }
            }
            var value = rows[i]["value"];
            var date = new Date(keys[2]);
            var ws = keys[0];
            if (date < dateRangeStart || date > dateRangeEnd) {
                console.log("skipping ws: " + ws + ", date: " + date);
                continue;
            }
            if(ws != currWS) {
                if (currWS != "") {
                    var fractFailed = numFailed / numSamples;
                    dataArray.push([fractFailed, currWS, date, numSamples]); // need to do this below after the last element also
                }
                currWS = ws;
                numSamples = 1;
                if(value == "FAILED") { numFailed = 1; }
            } else {
                numSamples++;
                if(value == "FAILED") { numFailed++; }
            }            
        }
        var fractFailed = numFailed / numSamples;
        //console.log("pushing: " + [fractFailed, currWS, date, numSamples]);
        dataArray.push([fractFailed, currWS, date, numSamples]);
        
        
        // sort on date
        dataArray.sort(function (a, b) {
                        //return a[0] - b[0]
                        return a[2] - b[2]
        }
        );
        // add "serial number" to each element
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
        }
        return dataArray;
        
}

/**
 * Generates a dataset for boxplots based on a specified index of the values
 * @param {Array} dataset		An array of arrays (the dataset used to generate the runchart)
 * @param {Integer} index		index of the array that contains the value
 * @returns {Array} 			An array of arrays of values. 
 */
function generateGenericBoxDataset (dataset, index) {
        var dataArray = [];
        dataArray[0] = [];
        for (var i = 0; i<dataset.length; i++) {
                dataArray[0].push(dataset[i][index]);
        }
        return dataArray;
}


/**
 * Generates a dataset for seq volume output runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @returns {Array} 			!!!!!!! An array of date-percent-project as arrays. 
 */
 //use couchdb view "KPI3_1 => re-write this function
function generateDeliveredDataDataset (jsonview, dateRangeStart, dateRangeEnd) {
    var dataArray = [];
    var rows = jsonview["rows"];
    
    for (var i = 0; i < rows.length; i++) {
        var key = rows[i]["key"];
        var val = rows[i]["value"];
        var d = key[0]; //date string
        var date = new Date(d);
        if (date < dateRangeStart || date > dateRangeEnd) { continue; }
        var projName = key[1];
        var platform = val[0];
        var orderedLanes = val[1];
        var numSamples = val[3];
        var dataDelivered = val[4];
        var fraction = val[5];
        if (fraction != null) {
            dataArray.push([fraction, projName, date, platform, orderedLanes, numSamples, dataDelivered]);
        }
    }
    // sort on date
    dataArray.sort(function (a, b) {
                    //return a[0] - b[0]
                    return a[2] - b[2]
    }
    );
    // add "serial number" to each element
    for (var j = 0; j < dataArray.length; j++) {
            var tmpdata = dataArray[j];
            tmpdata.unshift(j + 1);
    }
    return dataArray;
}

/**
 * Code to draw the run chart plot for failed lib preps
 * @param dataset  Parsed json object
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} clines Array of numbers representing where x week control lines should be drawn, e.g.[6, 10]
 * @param width plot width
 * @param height plot height
 * @param (padding) plot padding
 * @param (maxY) Optional. Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawFailedLpRunChart(dataset, divID, clines, width, height, padding, maxY) {
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
    console.log("maxY val: " + maxY)
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
       //.attr("r", 4) // make radius depend on workset size? 1 - 96 -> 4-10 ?
       .attr("r", function(d) {
                return Math.sqrt(d[4]) + 2;
        }) // make radius depend on workset size
       .on("mouseover", function(d) {
            d3.select(this)
              //.attr("r", 7)
              .style("fill", "teal")
              ;
            var unit = "samples";
            if (d[4] == 1) { unit = "sample"; }
            var xPosition = xScale(d[0]) + 10;
            var yPosition = yScale(d[1]);
            //Create the tooltip label
            svg.append("text")
              .attr("id", "tooltip1")
              .attr("x", xPosition)
              .attr("y", yPosition)
            .text(d[2]) // workset id
            ;
            svg.append("text")
              .attr("id", "tooltip2")
              .attr("x", xPosition)
              .attr("y", yPosition + 13)
            .text(dateFormat(d[3])) // date
            ;
            svg.append("text")
              .attr("id", "tooltip3")
              .attr("x", xPosition)
              .attr("y", yPosition + 26)
            .text(d[4] + " " + unit) // no of samples
            // add ws size?
            ;	

       })
       .on("mouseout", function(d) { //Remove the tooltip
            d3.select(this)
              //.attr("r", 4)
              .style("fill", "#5B87FF")
              ;
               d3.select("#tooltip1").remove();
               d3.select("#tooltip2").remove();
               d3.select("#tooltip3").remove();
       })
       .on("click", function(d) {
                var wsID = d[2].split("-")[1];
                var url = "https://genologics.scilifelab.se:8443/clarity/work-complete/" + wsID; //https://genologics.scilifelab.se:8443/clarity/work-complete/15609
                window.open(url, "lims");
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
            .attr("x", padding + 35)
            .attr("class", "axis_label")
            .style("text-anchor", "middle")
            .text("Fraction failed samples");
        // x axis label
        svg.append("text")
            //.attr("transform", "rotate(-90)")
            .attr("y", height - 20)
            .attr("x", width)
            .attr("class", "axis_label")
            .text("project #");
        
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
 * Code to draw the run chart plot for delivered data
 * @param dataset  Parsed json object
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} clines Array of numbers representing where x week control lines should be drawn, e.g.[6, 10]
 * @param width plot width
 * @param height plot height
 * @param (padding) plot padding
 * @param (maxY) Optional. Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawDeliveredDataRunChart(dataset, divID, clines, width, height, padding, maxY) {
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
    console.log("maxY val: " + maxY)
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
              //.attr("r", 7)
              .style("fill", "teal")
              ;
            var unit = "samples";
            if (d[4] == 1) { unit = "sample"; }
            var xPosition = xScale(d[0]) + 10;
            var yPosition = yScale(d[1]);
            //Create the tooltip label
            svg.append("text")
              .attr("id", "tooltip1")
              .attr("x", xPosition)
              .attr("y", yPosition)
            .text(d[2]) // workset id
            ;
            svg.append("text")
              .attr("id", "tooltip2")
              .attr("x", xPosition)
              .attr("y", yPosition + 13)
            .text(dateFormat(d[3])) // date
            ;
            svg.append("text")
              .attr("id", "tooltip3")
              .attr("x", xPosition)
              .attr("y", yPosition + 26)
            .text(d[4] + " " + unit) // no of samples
            // add ws size?
            ;	

       })
       .on("mouseout", function(d) { //Remove the tooltip
            d3.select(this)
              //.attr("r", 4)
              .style("fill", "#5B87FF")
              ;
               d3.select("#tooltip1").remove();
               d3.select("#tooltip2").remove();
               d3.select("#tooltip3").remove();
       })
       //.on("click", function(d) {
       //         var wsID = d[2].split("-")[1];
       //         var url = "https://genologics.scilifelab.se:8443/clarity/work-complete/" + wsID; //https://genologics.scilifelab.se:8443/clarity/work-complete/15609
       //         window.open(url, "lims");
       //})
       //.on("click", function(d) {
       //         var projID = d[2];
       //         var url = "http://genomics-status.scilifelab.se/projects/" + projID;
       //         window.open(url, "genomics-status");
       //})
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
            .attr("x", padding + 35)
            .attr("class", "axis_label")
            .style("text-anchor", "middle")
            .text("data del/data ordered");
        // x axis label
        svg.append("text")
            //.attr("transform", "rotate(-90)")
            .attr("y", height - 20)
            .attr("x", width)
            .attr("class", "axis_label")
            .text("project #");
        
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
