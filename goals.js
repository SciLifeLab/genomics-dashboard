/**
 * Generates a dataset for runchart line plot over time from a couchdb view for "standard" projects: RNA-seq, resequencing, seq capture
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @returns {Array} 			An array [ order, pid, num_samples, date, daysX, daysY, ... ]. Times are in days
 */
function generateStandardRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey) {
        var dataArray = [];
        var rows = jsonview["rows"];
        var projects = {};
        var dateFormat = d3.time.format("%Y-%m-%d");

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
            if(type != "Production") { continue; }
            if (appl != "Exome capture" &&
                appl != "RNA-seq (total RNA)" &&
                appl != "WG re-seq" &&
                appl != "Metagenome") {
                continue;
            }
            
            
            var sampleDateFrom = values[dateFromKey];
            var sampleDateTo = values[dateToKey];
            var numSamples = values["Samples"];
            var done = true;
            if (sampleDateTo == "0000-00-00") {
                sampleDateTo = dateFormat(dateRangeEnd); // set to dateRangeEnd (e.g. comparison date)
                done = false;
            }
            if(projects[pid] == undefined) {
                projects[pid] = {
                                    "type": type,
                                    "appl": appl,
                                    "pf": pf,
                                    "num_samples": numSamples,
                                    "fromDate": sampleDateFrom,
                                    "toDate": sampleDateTo,
                                    "daydiff": daydiff(new Date(sampleDateFrom), new Date(sampleDateTo)),
                                    "done": done
                                }
            //} else {
            //    if(sampleDateFrom < projects[pid]["fromDate"]) { projects[pid]["fromDate"] = sampleDateFrom; }
            //    if(sampleDateTo > projects[pid]["toDate"]) { projects[pid]["toDate"] = sampleDateTo; }
            //    projects[pid]["daydiff"] = daydiff(new Date(projects[pid]["fromDate"]), new Date(projects[pid]["toDate"]));
            //    projects[pid]["num_samples"]++;
            //    if (projects[pid]["done"] == true && done == false) {
            //        projects[pid]["done"] = false; //set to false if one sample in the project isn't done
            //    }
                
            }
        }

        // out data structure: [ order, pid, num_samples, date, daysX, daysY, ... ]. Order is added after date sort
        for (var pid in projects) {
            // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
            //if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }
            if (projects[pid]["fromDate"] == "0000-00-00") { continue; }
            
            //var done = (projects[pid]["toDate"] != "0000-00-00");
            
            //// check if data is in scope
            //// within date range
            //var toDate;
            //if (!done) {
            //    toDate = dateRangeEnd;
            //    //console.log("not done. setting date to " + toDate);
            //} else {
                toDate = new Date(projects[pid]["toDate"]);
                //console.log("DONE! setting date to " + toDate);
            //}
            var fromDate = new Date(projects[pid]["fromDate"]);
            //if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
            if (fromDate < dateRangeStart || fromDate > dateRangeEnd) { continue; }
            
            console.log(toDate)
            
            //// we find ourselves with a project that has a toDate within range, so write it to the output array
            dataArray.push([
                pid,
                projects[pid]["num_samples"],
                new Date(projects[pid]["fromDate"]),
                //new Date(projects[pid]["toDate"]),
                projects[pid]["daydiff"],
                toDate,
                projects[pid]["done"]
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
 * Generates a dataset for boxplots based on a specified index of the values
 * @param {Array} dataset		An array of arrays (the dataset used to generate the runchart)
 * @param {Number} index		index of the array that contains the value
 * @param {Number} filterIndex		index of the array that contains the boolean value to filter on
 * @returns {Array} 			An array of arrays of values. 
 */
function generateFilteredGenericBoxDataset (dataset, index, filterIndex) {
        var dataArray = [];
        dataArray[0] = [];
        for (var i = 0; i<dataset.length; i++) {
            if (dataset[i][filterIndex] == false) {
                continue;
            }
            var value = dataset[i][index];
            if (isNaN(value)) { continue; }
            dataArray[0].push(value);
        }
        return dataArray;
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
function drawGoalRunChart(dataset, divID, clines, width, height, padding, maxY) {
    // Set default padding
    if(padding === undefined) {
        padding = 30;
    }
    // check how many time series there are in the data set
    //var numSeries = dataset[0].length - 4; // There are four other pieces of information for each project
    var numSeries = 1; // There are four other pieces of information for each project
        
    // DOM id for svg object
    var svgID = divID + "SVG";
    
    // DOM id for data line
    var dataLineID = divID + "_data_line";
    

    
    // Time format
    var dateFormat = d3.time.format("%Y-%m-%d");

    // Get a handle to the tooltip div & calculate appropriate size for mouseover
    var tooltipDiv = d3.select(".tooltip");
    var tooltipHeight = tooltipDiv.style("height");
    // remove last two letters: "px" & turn into an integer
    tooltipHeight = parseInt(tooltipHeight.substring(0, tooltipHeight.length - 2));
    var tooltipRowHeight = "13"; // 13px per row
    var extraTooltipRows = numSeries; // add space for an extra row(s) if more than one time series + 1 for the no. of samples
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
                      .ticks(5);
    
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
    var lines = [];
    var circles = svg.selectAll("circle")
           .data(dataset)
           .enter()
           ;
    for(var i=0; i < numSeries; i++) { // this is not relevant for this plot. SHOULD BE REMOVED
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
           .attr("fill", function(d) {
                if (d[6] == false) {
                    //return timeseriesColors[2];
                    return "red";
                } else {
                    return timeseriesColors[0];
                    //return "darkgreen";
                }
            })
           .attr("r", function(d) {
                return 1 + Math.sqrt(d[2]);    
            })
           .on("mouseover", function(d) {
                var timeString = "";
                for (j = 4; j < (numSeries + 4); j++) {
                    timeString += d[j] + " days";
                }
                var sizeUnit = "sample";
                if (d[2]>1) {
                    sizeUnit += "s";
                }
                d3.select(this)
                  .attr("r", 7)
                  ;
                // Make tooltip div visible and fill with appropriate text
                tooltipDiv.transition()		
                    .duration(200)		
                    .style("opacity", .9);		
                tooltipDiv.html(d[1] + "<br/>"
                                + dateFormat(d[3]) + "<br/>"
                                + timeString + "<br/>"
                                + d[2] + " " + sizeUnit
                                )	
                    .style("left", (d3.event.pageX) + "px")		
                    .style("top", (d3.event.pageY - 28) + "px")
                    .style("height", (tooltipNewHeight + "px"))
                    ;	    
           })
           .on("mouseout", function(d) { //Remove the tooltip
                d3.select(this)
                    .attr("r", function(d) {
                         return 1 + Math.sqrt(d[2]);    
                     })
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
    if(newchart) {
        // y axis label
        svg.append("text")
            .attr("y", padding - 10 )
            .attr("x", padding)
            .attr("class", "axis_label")
            .text("days");
        // x axis label
        svg.append("text")
            .attr("y", height - 3)
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
