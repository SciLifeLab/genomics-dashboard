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
 * Datastructure KPI_appl_pf_dates_sampl_lanes (2013-11-29)
    { "rows": [
            {
                "key": [
                    "Pxxx", "Production", "Metagenome", "HiSeq 2000/2500 High Output", "Pxxx_101"   
                ],
                "value: {
                    "Arrival date":"2013-07-03",
                    "Rec Ctrl start":"2013-07-18",
                    "Queue date":"2013-07-17",
                    "Lib prep start":"2013-09-26",
                    "QC library finished":"2013-10-03",
                    "Sequencing start":"2013-10-08",
                    "All samples sequenced":"2013-10-20",
                    "Close date":"2013-11-11",
                    "Samples":1,
                    "Lanes":0.066666666666666665741
                }
            },
            {
                ...
            }
        ]
    }
 */

// Look at calculating and adding a first in queue date. Is this the proper place to do this? On sample level instead?
// Sort on queue date - arrival date - proj ID (?)
function reduceToProject(jsonview) {
    var rows = jsonview["rows"];
    var projects = {};
    var prepStarts = {};
    
    // Loop through all samples
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var keys = rows[i]["key"];
        var values = rows[i]["value"];
        var pid = keys[0]; // project id
        var type = keys[1]; // type = Production || Applications
        var appl = keys[2]; // application
        var pf = keys[3]; // platform
        var sid = keys[4]; // sample id
        if(projects[pid] == undefined) { // new project, initialize with keys
            projects[pid] = {
                                "type": type,
                                "appl": appl,
                                "pf": pf,
                            }
            for (var valKey in values) {
                projects[pid][valKey] = values[valKey]; // intialize all data for proj with values of first sample
            }
        } else {
            // update data with appropriat date, or sum up lanes or samples
            for (var valKey in values) {
                var currVal = values[valKey];
                if (valKey == "Lib prep start") { // capture prep start dates
                    if (prepStarts[currVal] == undefined) { // no data for this date, so initialize array
                        prepStarts[currVal] = [ ]; 
                    }
                    prepStarts[currVal].push( projects[pid]); // add project object   
                }
                if(valKey == "Samples" || valKey == "Lanes") {
                    projects[pid][valKey] += values[valKey];
                } else if (valKey.indexOf("start") != -1 ) { // get earliest start dates
                    if (currVal < projects[pid][valKey]) { projects[pid][valKey] = currVal; } // handles 0000-00-00 as well
                } else { // get latest done dates, except 0000-00-00
                    if (currVal == "0000-00-00") {
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
            "Rec Ctrl start":projects[pid]["Rec Ctrl start"],
            "Queue date":projects[pid]["Queue date"],
            "Lib prep start":projects[pid]["Lib prep start"],
            "QC library finished":projects[pid]["QC library finished"],
            "Sequencing start":projects[pid]["Sequencing start"],
            "All samples sequenced":projects[pid]["All samples sequenced"],
            "Close date":projects[pid]["Close date"],
            "Samples":projects[pid]["Samples"],
            "Lanes":projects[pid]["Lanes"]
        };
        
        var newRow = {
            "key": newKey,
            "value": newValue
        }
        outRows.push(newRow);
    }

    //// sort by libprep start for first in queue calc
    //outRows.sort(sortByLibprepStart);
    //console.log(outRows);
    
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
    //console.log(prepStartsArr);
    
    ////  2nd try - not working properly - testing stuff for first in queue calc
    //var firstLPDate;
    //var prevFirstLPDate;
    //var prevLPDate;
    //var firstFLDate;
    //var prevFLDate;
    //
    //for (var i =0; i < outRows.length; i++) {
    //    var p = outRows[i]; // project object
    //    if(p["key"][1] == "Application") { continue; }
    //    if(p["key"][2] == "Finished library") {
    //        
    //    } else {
    //        if (firstFLDate == undefined) { firstFLDate = p["value"]["Queue date"]; prevFirstLPDate = firstFLDate; }
    //        if(p["value"]["Lib prep start"] == prevLPDate) {
    //            p["value"]["First in queue"] = prevFirstLPDate;
    //        } else {
    //            p["value"]["First in queue"] = firstFLDate;
    //            prevFirstLPDate = firstFLDate;
    //        }
    //        firstFLDate = p["value"]["Lib prep start"];
    //        prevLPDate = p["value"]["Lib prep start"];
    //    
    //    }
    //}
    //console.log(outRows);
    
    //// 1st try - not that great. testing stuff for first in queue calc
    //var lpStarts = {};
    //for (var i = 0; i < outRows.length; i++) {
    //    if(outRows[i]["key"][1] == "Application") { continue; }
    //    if(outRows[i]["key"][2] == "Finished library") { continue; }
    //    if(lpStarts[outRows[i]["value"]["Lib prep start"]] == undefined) { // create array for date if it doesn't exist
    //        lpStarts[outRows[i]["value"]["Lib prep start"]] = []
    //    }
    //    lpStarts[outRows[i]["value"]["Lib prep start"]].push(outRows[i]); // push project object to array
    //}
    //var prevLpDate;
    //var dates = [];
    //for (var d in lpStarts) {
    //    dates.push(d);
    //}
    //dates.sort();
    ////for (var lpDate in lpStarts) {
    //for (var i = 0; i < dates.length; i++) {
    //    var lpDate = dates[i];
    //    if (lpDate == "0000-00-00") {
    //        continue;
    //    }
    //    for(var j =0; j < lpStarts[lpDate].length; j++) {
    //        var o = lpStarts[lpDate][j];
    //        var lpD = o["value"]["Lib prep start"];
    //        if(prevLpDate == undefined) { prevLpDate = o["value"]["Queue date"]} // first project
    //        o["value"]["First in queue"] = prevLpDate;
    //    }
    //    prevLpDate = lpDate;
    //}
    //for (var i = 0; i < lpStarts["0000-00-00"]; i++) {
    //    
    //}
    //console.log(lpStarts);
    
    
    return { "rows": outRows };
    
}

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
//function sortByLibprepStart (a, b) {
//    var aV =  a["value"];
//    var bV =  b["value"];
//    var aLPS = aV["Lib prep start"];
//    var bLPS = bV["Lib prep start"];
//    var aQD = aV["Queue date"];
//    var bQD = bV["Queue date"];
//    var aAD = aV["Arrival date"];
//    var bAD = bV["Arrival date"];
//    var aPid = a["key"][0];
//    var bPid = b["key"][0];
//    //var aAppl = a["key"][2];
//    //var bAppl = b["key"][2];
//    //console.log(aLPS)
//    if(aLPS < bLPS) {
//        if(aLPS == "0000-00-00") {
//            console.log("a is 0000-00-00")
//            return 1; } // if no lib prep start date yet => end of queue
//        return -1;
//    }
//    if(aLPS > bLPS) {
//        if(bLPS == "0000-00-00") { return 1; } // if no lib prep start date yet => end of queue
//        return 1;
//    }
//    if(aQD < bQD) {
//        if(aQD == "0000-00-00") { return 1; } // if no queue date yet => end of queue
//        return -1;
//    }
//    if(aQD > bQD) {
//        if(bQD == "0000-00-00") { return 1; } // if no queue date yet => end of queue
//        return 1;
//    }
//    if(aAD < bAD) { return -1; }
//    if(aAD > bAD) { return 1; }
//    if(aPid < bPid) { return -1; }
//    if(aPid > bPid) { return 1; }
//    return 0;
//    
//}

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
        var emit_id = "P680"; // for debugging for a particular project eg if(k[2] == emit_id)
        
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
                    
                    dataArray.push([ totalQF, k[1], finishedDate, k[2] ]);  /*  Testing for link out to genomics-status: timediff, Project name, finished date, Project Id*/
                }
                
            }
            // debugging code
            //if(k[2] == emit_id) {
            //    console.log(k[1] + ", " + dateFromKey + ": " +dates[dateFromKey] + ", " + dateToKey + ": " + dates[dateToKey]);
            //}
        }
        dataArray.sort(dateValueSort);
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
        }
        return dataArray;
        
}

/**
 * NEW implementation using the one-for-all non-reduced map view
 * 
 * Generates a dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {Boolean} onlyProduction	If true only include data where type == "Production"
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array of date-times-project as arrays. Times are in days
 */
function generateRunchartDataset_New (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, onlyProduction, filter, inverseSelection) {
        var dataArray = [];
        var rows = jsonview["rows"];
        var projects = {};
        
        // Each row is one sample
        // Need logic to summarize dates per project
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var keys = rows[i]["key"];
            var values = rows[i]["value"];
            
            
            var pid = keys[0]; // project id
            var type = keys[1]; // type = Production || Applications
            var appl = keys[2]; // application
            var pf = keys[3]; // platform
            var sid = keys[4]; // sample id
            if(onlyProduction && type != "Production") { continue; }
            
            var filter_field;
            if(filter.indexOf("library") != -1) {
                filter_field = 2; // index for application in keys array
            } else if(filter.indexOf("iSeq") != -1) {
                filter_field = 3; // index for platform in keys array
            }
            // more here... ?
            
            if(filter) {
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

        // out data structure: [ order, daydiff, num_samples, doneDate, project_id ]. Order is added after date sort?
        for (var pid in projects) {
            // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
            if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }

            //// check if data is in scope
            //// within date range
            var toDate = new Date(projects[pid]["toDate"]);
            if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
            
            // we find ourselves with a project that has a toDate within range, so write it to the output array
            dataArray.push([
                projects[pid]["daydiff"],
                projects[pid]["num_samples"],
                projects[pid]["toDate"],
                pid
            ]);
        }
    
        dataArray.sort(dateValueSort);
        // add order number as first element in each array
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
        }
        return dataArray;
        
}

/**
 * NEW NEW (i.e. third) implementation using the data from the reduceToProject function on the one-for-all non-reduced map view
 * 
 * Generates a dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {Boolean} onlyProduction	If true only include data where type == "Production"
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array of date-times-project as arrays. Times are in days
 */
function generateRunchartDataset_Take3 (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, onlyProduction, filter, inverseSelection) {
        var dataArray = [];
        var rows = jsonview["rows"];
        var projects = {};
        
        // Each row is one project
        // ??Need logic to summarize dates per project
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
            
            var filter_field;
            if(filter.indexOf("library") != -1) {
                filter_field = 2; // index for application in keys array
            } else if(filter.indexOf("iSeq") != -1) {
                filter_field = 3; // index for platform in keys array
            }
            // more here... ?
            
            if(filter) {
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

        // out data structure: [ order, daydiff, num_samples, doneDate, project_id ]. Order is added after date sort?
        for (var pid in projects) {
            // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
            if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }

            //// check if data is in scope
            //// within date range
            var toDate = new Date(projects[pid]["toDate"]);
            if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
            
            // we find ourselves with a project that has a toDate within range, so write it to the output array
            dataArray.push([
                projects[pid]["daydiff"],
                projects[pid]["num_samples"],
                projects[pid]["toDate"],
                pid
            ]);
        }
    
        dataArray.sort(dateValueSort);
        // add order number as first element in each array
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
    var closeKey = "Close date";
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
    //var dataArray = [recCtrl, libPrep, seq];
    var dataArray = [recCtrl]; // only show recCtrl -- quick fix, should really take away all code below that counts other stuff 


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
        var closeDate = dates[closeKey];
        //var finishedDate = new Date(dates[finishedKey]);
        
        //console.log("in rows");
                
        var step;
        if(arrivalDate != "0000-00-00" && arrivalDate < "2013-07-01") { // remove old data
            continue;
        }
        if((closeDate != "0000-00-00") && (closeDate < cmpDateStr)) { // closed projects
            // console.log(cmpDateStr + " Skipping closed: " + k[1] + " " + closeDate);
            continue;
        }
        if ((arrivalDate > cmpDateStr) || (arrivalDate == "0000-00-00") ) { // proj w arrival date after cmp date
            //console.log(cmpDateStr + " Skipping " + arrivalDate);
            continue;
        } 
        if ( (queueDate == "0000-00-00") || cmpDateStr < queueDate) { 
            if (allSeqDate != "0000-00-00" && cmpDateStr > allSeqDate) { // to handle data without a queue date but where seq is finished
                step = "no step";
            } else if (libQCDate != "0000-00-00") { // missing queue date, seq is not finished, but libQC passed => seq
                seq.value++;
                step = "seq";
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
        
        
    }
    return dataArray;
    
}

// This is a quick-fix that uses the old map-reduce view. Change to the new one later
/**
 * Generates a dataset for active projects bar chart from a couchdb view
 * @param {Object} jsonview		A parsed json stream (key has to be in the form [application, project_name])
 * @param {Date} cmpDate	A Date object to specify the date to generate data for 
 * @returns {Array} 			An array of step-#projects as step-value objects.
 */
function generateRecCtrlBarchartDataset (jsonview, cmpDate) {
    //console.log(jsonview);
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    
    // Key strings in indata
    var arrivalKey = "Arrival date";
    var queueKey = "Queue date";
    var libQCKey = "QC library finished";
    var allSeqKey = "All samples sequenced";
    var closeKey = "Close date";
    //var finishedKey = "Finished date";

    /**
     * Rec ctrl		=	arrivalKey to queueKey
     */

    //var recCtrl = { key: "Rec ctrl", value: 0 };					
    //var libPrep = { key: "Lib prep", value: 0 };					
    //var seq = { key: "Seq", value: 0 };
    ////var rawDataQC = { step: "Raw data QC", value: 0 };

    var dna = { key: "DNA", value: 0 };
    var rna = { key: "RNA", value: 0 };
    var seqCap = { key: "SeqCap", value: 0 };
    var other = { key: "Other", value: 0 };
    var finLib = { key: "FinLib", value: 0 };

    var dataArray = [dna, rna, seqCap, other, finLib]; 


    var rows = jsonview["rows"];
    //var j = 0; // counter for data points that make it into the data array NOT USED
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var appl = k[0];
        if (appl == null) { continue; }
        //var libPrepProj = false;
        //if(k[0] != null && k[0].indexOf("Finished library") == -1 )  { libPrepProj = true; }  

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
        } else if (appl == "Finished library") {
            applCat = "FinLib";
        } else {
            applCat = "Other";
        }
        
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
        var closeDate = dates[closeKey];
        //var finishedDate = new Date(dates[finishedKey]);
        
        //console.log("in rows");
        if ( (queueDate == "0000-00-00") || cmpDateStr < queueDate) { 
            if (allSeqDate != "0000-00-00" && cmpDateStr > allSeqDate) { // to handle data without a queue date but where seq is finished
                continue;
            } else if (libQCDate != "0000-00-00") { // missing queue date, seq is not finished, but libQC passed => seq
                continue;
            } else if (closeDate != "0000-00-00") { // closed
                continue;
            } else { // in rec ctrl
                //console.log(k[2])
                switch(applCat) {
                    case "DNA":
                        dna.value++;
                        break;
                    case "RNA":
                        rna.value++;
                        break;
                    case "SeqCap":
                        seqCap.value++;
                        break;
                    case "Other":
                        other.value++;
                        break;
                    case "FinLib":
                        finLib.value++;
                        break;
                }
             }
        }
               
        
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

    var dateFormat = d3.time.format("%d/%m");

    var week12Date = new Date(cmpDate - 12 * 7 * day);
    var week8Date = new Date(cmpDate - 8 * 7 * day);
    var week4Date = new Date(cmpDate - 4 * 7 * day);
    
    var twelve = { key: dateFormat(week12Date) + " - " + dateFormat(new Date(week8Date - day)), value: 0 };					
    var eight = { key: dateFormat(week8Date) + " - " + dateFormat(new Date(week4Date - day)), value: 0 };					
    var four = { key: dateFormat(week4Date) + " - " + dateFormat(cmpDate), value: 0 };

    var dataArray = [twelve, eight, four];
    

    var rows = jsonview["rows"];
    //var j = 0; // counter for data points that make it into the data array NOT USED
    for (var i = 0; i < rows.length; i++) {
        //console.log("looping through json array: 1");
        var k = rows[i]["key"];
        var dates = rows[i]["value"];
        var arrivalDate = new Date(dates[arrivalKey]);
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
        }
    }
    // calculate weekly averages
    four.value /= 4;
    eight.value /= 4;
    twelve.value /= 4;
    
    return dataArray;
    
}

// calculate # lanes started for sequencing
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
// calculate # lanes started for sequencing
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
    
    
    // Time format
    var dateFormat = d3.time.format("%Y-%m-%d");

    
    //Create scale functions
    if(maxY == undefined) {
        maxY = d3.max(dataset, function(d) { return d[1]; });
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
    //if(svg == undefined) {
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
            //.text(d[2])
            .text(d[4])
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



/**
 * Code to draw a boxplot
 * @param dataset  Parsed data
 * @param {String} divID Id of DOM div to where plot should reside
 * @param plotHeight plot height
 */
function drawBoxPlot(dataset, divID, plotHeight, maxY, bottom_margin) {
    var margin = {top: 30, right: 20, bottom: 30, left: 20},
        width = 60 - margin.left - margin.right,
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
 * @param appl_json  Parsed json object for the "application_data"
 * @param pf_json  Parsed json object for the "platform_data"
 * @param {Date} plotDate Date for which to draw data
 * @param {Date} startDate Date to start from
 * @param height panel plot height
 * @param rc_width runchart plot widths
 */
//function drawProcessPanels(appl_json, plotDate, startDate, height, rc_width){
//function drawProcessPanels(appl_json, pf_json, plotDate, startDate, height, rc_width){
function drawProcessPanels(appl_json, pf_json, plotDate, startDate, height, draw_width){
    // keys for total time calculation
    var startKey = "Queue date";
    var endKey = "All samples sequenced";
    //var endKey = "Close date";

    var rc_width = draw_width / 4; // 4 run chart panels on the lower half

    /** 3 bar panels on the upper half.
     *  However, give the demand and ongoing charts less space than the load bars
     *  Note that the drawing call for the load bars are in dashboard_all.html 
     */
    var bar_width = draw_width / 4;

    //var ongoingDataset = generateBarchartDataset(appl_json, plotDate);
    var ongoingDataset = generateRecCtrlBarchartDataset(appl_json, plotDate); // new split on application
    //console.log(demandDataset);
    
    
    //var maxY = d3.max(ongoingDataset, function(d) { return d.value });
    
    //drawBarchartPlot(ongoingDataset, "ongoing_bc", (bar_width + 110), height, 30, maxY);
    //drawBarchartPlot(ongoingDataset, "ongoing_bc_plot", (bar_width / 2), height, 30);
    
    /** Total delivery times data set */
    var totalRcDataset = generateRunchartDataset(appl_json, startDate, plotDate, startKey, endKey);
    //console.log(totalRcDataset);
    
    /** Step time datasets for all projects */
    var recCtrlDataset = generateRunchartDataset(appl_json, startDate, plotDate, "Arrival date", "Queue date");
    var libPrepDataset = generateRunchartDataset(appl_json, startDate, plotDate, "Queue date", "QC library finished", "Finished library", true); 
    var seqDataset = generateRunchartDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced"); 
    
    // get highest value in these data sets to set a common scale
    var maxTot = d3.max(totalRcDataset, function(d) {return d[1];});
    var maxRC = d3.max(recCtrlDataset, function(d) {return d[1];});
    var maxLP = d3.max(libPrepDataset, function(d) {return d[1];});
    var maxSeq = d3.max(seqDataset, function(d) {return d[1];});
    maxStepY = Math.max(maxTot, maxRC, maxLP, maxSeq)

    drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
    var totalBpDataset = generateBoxDataset(appl_json, startDate, plotDate, startKey, endKey);
    //console.log(totalBpDataset);
    drawBoxPlot(totalBpDataset, "total_bp", height);
    
    drawRunChart(recCtrlDataset, "rec_ctrl_rc", [2], rc_width, height, 30, maxStepY);
    var recCtrlBpDataset = generateBoxDataset(appl_json, startDate, plotDate, "Arrival date", "Queue date");
    drawBoxPlot(recCtrlBpDataset, "rec_ctrl_bp", height, maxStepY);
    
    drawRunChart(libPrepDataset, "lib_prep_rc", [2.5], rc_width, height, 30, maxStepY);
    var libPrepBpDataset = generateBoxDataset(appl_json, startDate, plotDate, "Queue date", "QC library finished", "Finished library", true);
    drawBoxPlot(libPrepBpDataset, "lib_prep_bp", height, maxStepY);
    
    drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    var seqBpDataset = generateBoxDataset(pf_json, startDate, plotDate, "QC library finished", "All samples sequenced");
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
                drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: default").text("All projects");
                
                drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: default").text("All projects");
                
                setNo++;
                break;
            case 2:
                drawRunChart(totalRcLPDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpLPDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Lib prep projects");
                setNo++;
                break;
            case 3:
                drawRunChart(totalRcFLDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpFLDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Finished library projects");
                setNo++;
                //setNo = 1;
                break;
            case 4:
                drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("MiSeq projects");
                
                drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: orange").text("MiSeq projects");
                setNo++;
                
                break;
            case 5:
                drawRunChart(totalRcHiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpHiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("HiSeq projects");
                
                drawRunChart(seqHiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpHiSeqDataset, "seq_bp", height, maxStepY);
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