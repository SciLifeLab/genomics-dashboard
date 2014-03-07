/* **** Helper functions **** */

/**
 * Sort function for layer objects to sort by platform.<br>
 * HiSeq before MiSeq - then on Queue date
 * @param {Object} a		Layer object
 * @param {Object} b		Layer object
 * @returns {Number} A negative number if a should be sorted before b, a positive number if vice versa, otherwise 0 
 */
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

/**
 * Sort function for layer objects to sort by application.<br>
 * DNA/RNA/SeqCap/Other - then on Queue date
 * @param {Object} a		Layer object
 * @param {Object} b		Layer object
 * @returns {Number} A negative number if a should be sorted before b, a positive number if vice versa, otherwise 0 
 */
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
        if(a[i]["y"] != 0) { aAppl = map[a[i]["x"]]; aQ = a[i]["queueDate"]; aArr = a[i]["arrivalDate"]; aPid = a[i]["pid"];}
        if(b[i]["y"] != 0) { bAppl = map[b[i]["x"]]; bQ = b[i]["queueDate"]; bArr = b[i]["arrivalDate"]; bPid = b[i]["pid"];}
    }
    if(aAppl < bAppl) return -1;
    if(aAppl > bAppl) return 1;
    if(aQ < bQ ) return -1;
    if(aQ > bQ ) return 1;
    if(aArr < bArr ) return -1;
    if(aArr > bArr ) return 1;   
    if(aPid < bPid ) return -1;
    if(aPid > bPid ) return 1;   
    return 0;
}


function getFirstInQueue(data) {
    var qD = "9999-99-99";
    var arrD = "9999-99-99";
    var firstPid;
    for (var i = 0; i < data.length; i++) {
        if (data[i][0]["queueDate"] < qD) {
            qD = data[i][0]["queueDate"];
            arrD = data[i][0]["arrivalDate"];
            firstPid = data[i][0]["pid"];
        } else if (data[i][0]["queueDate"] == qD) {
            if (data[i][0]["arrivalDate"] < arrD) {
                arrD = data[i][0]["arrivalDate"];
                firstPid = data[i][0]["pid"];
            } else if (data[i][0]["arrivalDate"] == arrD) {
                if (data[i][0]["pid"] < firstPid) {
                    firstPid = data[i][0]["pid"];
                }
            }
        }
    }
    return firstPid;
}
/**
 * Calculates number of projects per domain (x value) in a layer object data set
 * @param {Array} dataset  Array of array of layer objects
 * @param {Array} domain    Array of domain names (x values)
 * @returns {Object}    An object with counts per domain
 */
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

/**
 * Calculates number of units (worksets or lanes) per domain (x value) in a layer object data set
 * @param {Array} dataset  Array of array of layer objects
 * @param {Array} domain    Array of domain names (x values)
 * @param {String} [unit="lanes"]    Name of unit. Specify "samples" to get number of worksets, otherwise number of lanes
 * @returns {Object}    An object with counts per domain. 
 */
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

/**
 * Calculates the total y value for all stacked bars per domain (x value) in a layer object data set
 * @param {Array} dataset  Array of array of layer objects
 * @param {Array} domain    Array of domain names (x values)
 * @returns {Object}    An object with counts per domain
 */
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

/* **** Data transformation functions **** */

/**
 * Generates a dataset for Rec Ctrl project load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
function generateRecCtrlStackDataset(json, cmpDate) {

    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data

    var dataArray = [];
    var rows = json["rows"];
    var applBins = {};
    var cat = ["DNA", "RNA", "SeqCap", "Other", "FinLib", "Application"];
    for (i = 0; i < cat.length; i++) {
        //console.log("adding " + cat[i]);
        applBins[cat[i]] = { count: 0 };// initialize count for each category
    }
    //console.log(applBins);
    
    var projects = {};
    // loop through each sample and add upp num of projects
    for (var i = 0; i < rows.length; i++) {
        var k = rows[i]["key"];
        //console.log(k)
        var pid = k[0];
        var type = k[1];
        var appl = k[2];
        var sampleID = k[4];
        
        // skip projects that are labeled as neither Production or Application
        if (type == null ) { continue; }
        
        if(appl == null) { appl = "Other";}
        //console.log(sampleID);
        var applCat = "";
        if(type == "Application") {
            applCat = "Application"
        } else if (appl.indexOf("capture") != -1) {
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
        
        var v = rows[i]["value"];

        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
        // skip projects that have passed later process steps
        var libQCDate = v["QC library finished"];
        var seqDoneDate = v["All samples sequenced"];
        if (appl != "Finished library" && libQCDate != "0000-00-00") {
            continue;
        }
        if (seqDoneDate != "0000-00-00") {
            continue;
        }
            

        var arrDate = v["Arrival date"];
        var queueDate = v["Queue date"];
        if (arrDate != "0000-00-00" &&
            arrDate <= cmpDateStr &&
            queueDate == "0000-00-00") {
            // initialize a value for the project if it doesn't exist in applBins
            
            if(applBins[applCat][pid] == undefined) { //this is only done once for each project
                applBins[applCat][pid] = 1; // just add a value for the project
                applBins[applCat]["count"]++;
                //console.log(pid + ", " + type + ", " + appl + ", " + applCat);
            }

            //if(projects[pid] == undefined) { // is this needed?
            //    projects[pid] = { cat: applCat, arrivalDate: arrDate, queueDate: queueDate}
            //}
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    //console.log(applBins);
    var projArr = [];
    for (i = 0; i < cat.length; i++) {
        var o = { x: "RecCtrl", y: applBins[cat[i]]["count"], cat: cat[i] };
        var proj;
        for(var p in applBins[cat[i]]) {
            if(p.indexOf("P") == -1) { continue; }
            if (proj == undefined) {
                proj = p;
            } else {
                proj += ", " + p;
            }
        }
        o["projects"] = proj;
        proj = undefined;
        projArr.push(o);
    }
    
    tot = 0;
    for (var i = 0; i < projArr.length; i++) {
        projArr[i]["y0"] = tot;
        tot += projArr[i]["y"];
    }
   return [projArr];
}

/**
 * Generates a dataset for Libprep queue lane load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
        var type = k[1];
        var appl = k[2];
        if (type != "Production") { continue; } // only Production of interest
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

        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
        // skip samples already done, but where dates are missing in lims
        var libQCDate = v["QC library finished"];
        if (libQCDate != "0000-00-00") { continue; }
        var seqStartDate = v["Sequencing start"];
        if (seqStartDate != "0000-00-00") { continue; }
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
                projects[pid] = { queueDate: queueDate }
            }
        }
        
    }
    //console.log(pfBins);
    
    // remove proj name??????
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, queueDate: projects[projID]["queueDate"] };
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

/**
 * Generates a dataset for Finished lib queue lane load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
        var type = k[1];
        var appl = k[2];
        if (type != "Production") { continue; } // only Production of interest - is this true?? 
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

        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }

        // skip samples already done, but where dates are missing in lims
        var seqStartDate = v["Sequencing start"];
        if (seqStartDate != "0000-00-00") { continue; }
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
                projects[pid] = { queueDate: queueDate}
            }
        }
        
    }
    //console.log(pfBins);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in pfBins["HiSeq"]) {
        var hO = { x: "HiSeq", y: pfBins["HiSeq"][projID], pid: projID, queueDate: projects[projID]["queueDate"] };
        var mO = { x: "MiSeq", y: pfBins["MiSeq"][projID], pid: projID, queueDate: projects[projID]["queueDate"] };
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

/**
 * Generates a dataset for Libprep queue sample load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
    
    // array to capture libprep start dates
    var libPrepStartDates = [];
    
    var projects = {};
    // loop through each sample and add upp lane load per project
    for (var i = 0; i < rows.length; i++) {
        var k = rows[i]["key"];
        //console.log(k)
        var pid = k[0];
        var type = k[1];
        var appl = k[2];
        var sampleID = k[4];
        if (type != "Production") { continue; } // only Production of interest
        if (appl == "Finished library") { continue; } // fin lib projects not of interest
        if(appl == null) { appl = "Other";}
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
        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
        
        // skip samples already done, but where dates are missing in lims
        var libQCDate = v["QC library finished"];
        if (libQCDate != "0000-00-00") { continue; }
        var seqStartDate = v["Sequencing start"];
        if (seqStartDate != "0000-00-00") { continue; }
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }

        var arrivalDate = v["Arrival date"];
        var queueDate = v["Queue date"];
        var prepStartDate = v["Lib prep start"];
        libPrepStartDates.push(prepStartDate);
        
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
                projects[pid] = { queueDate: queueDate, arrivalDate: arrivalDate }
            }
            
        }
        
    }
    //console.log(pfBins);
    
    // get the last prep start date
        // filter function to remove duplicates
    function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
    }
    var libPrepStartDates = libPrepStartDates.filter( onlyUnique );
    libPrepStartDates.sort();
    
    var ps = libPrepStartDates.pop(); // last date
    while (ps > cmpDateStr ) { // continue pop'ing until last date is less than comparison date
        ps = libPrepStartDates.pop();
    }
    var lastLibPrepStart = ps;
    var daysSincePrepStart = daydiff(new Date(lastLibPrepStart), cmpDate);
    
    // put into "layer structure", sort & then add up y0's
    for (var projID in applBins["DNA"]) {
        var projArr = [];
        //for (c in cat) {
        for (i = 0; i < cat.length; i++) {
            var o = { x: cat[i], y: applBins[cat[i]][projID], pid: projID, queueDate: projects[projID]["queueDate"], arrivalDate: projects[projID]["arrivalDate"] };
            projArr.push(o);
        }
        dataArray.push(projArr);
    }
    // change to sort by application
    dataArray.sort(sortByApplication); // by application & queue date - arrival date - project ID

    var firstInQueuePid = getFirstInQueue(dataArray);
    //console.log("first in queue pid: " + firstInQueuePid);

    var tot = { DNA: 0, RNA: 0, SeqCap: 0, Other: 0};
    
    for (var i = 0; i < dataArray.length; i++) {
        for (var j = 0; j < dataArray[i].length; j++) {
            var a = dataArray[i][j]["x"];
            dataArray[i][j]["y0"] = tot[a];
            tot[a] += dataArray[i][j]["y"];
            //if (i == 0) { // add info about time since last libprep start for the project first in queue
            if (dataArray[i][j]["pid"] == firstInQueuePid) { // add info about time since last libprep start for the project first in queue
                dataArray[i][j]["lastLibPrep"] = lastLibPrepStart;
                dataArray[i][j]["daysSincePrepStart"] = daysSincePrepStart;
            }
        }
    }
    //console.log(dataArray);
        
    //return pfBins;
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

/**
 * Generates a dataset for Libprep ongoing sample load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
        var type = k[1];
        var appl = k[2];
        var sampleID = k[4];
        if (appl == "Finished library") { continue; } // fin lib projects not of interest
        if (type != "Production") { continue; } // only Production of interest
        if(appl == null) { appl = "Other";}

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
        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
        
        // skip samples already done, but where dates are missing in lims
        var seqStartDate = v["Sequencing start"];
        if (seqStartDate != "0000-00-00") { continue; }
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
                projects[pid] = { queueDate: queueDate, pid: pid}
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


/**
 * Generates a dataset for Libprep ongoing lane load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
        var type = k[1];
        var appl = k[2];
        if (appl == "Finished library") { continue; } // skip fin lib projects
        if (type != "Production") { continue; } // only Production of interest

        
        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
        // skip samples already done, but where dates are missing in lims
        var seqStartDate = v["Sequencing start"];
        if (seqStartDate != "0000-00-00") { continue; }
        var seqFinishedDate = v["All samples sequenced"];
        if (seqFinishedDate != "0000-00-00") { continue; }
        
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
                projects[pid] = { queueDate: queueDate, pid: pid}
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


/**
 * Generates a dataset for Seq lane load for stacked bar chart drawing
 * @param {Object} json		A parsed json stream object at sample level
 * @param {Date} cmpDate	A Date object to specify load date
 * @returns {Array} An array of arrays of "layer" objects 
 */
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
        var type = k[1];
        var appl = k[2];
        var sid = k[4];
        if (type != "Production") { continue; } // only Production of interest

        // Determine which platform
        var pf = k[3];
        var otherPf = "MiSeq";
        if (pf != "MiSeq") {
            pf = "HiSeq";
        } else {
            otherPf = "HiSeq";
        }
        
        var v = rows[i]["value"];
        // skip aborted projects
        var aborted_date = v["Aborted date"];
        if (aborted_date != null) {
            //console.log("Skipping " + keys[0]);
            continue;
        }
        // Skip aborted or finished *samples*
        if (v["Status"] == "Aborted" || v["Status"] == "Finished" ) {
            continue;
        }
        // skip closed projects
        var closeDate = v["Close date"];
        if(closeDate != "0000-00-00") { continue; }
        
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
            //console.log(pf + ", " + pid + ": " + sid + ", " + v["Lanes"]);

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
                projects[pid] = { queueDate: queueDate, pid: pid}
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

/* **** Drawing functions **** */

/**
 * Code to draw a stacked barchart plot
 * @param {Array} dataset  Array of array of layer objects
 * @param {String} divID    Id of DOM div to where plot should reside
 * @param {Number} width    plot width
 * @param {Number} height   plot height
 * @param {String} [unit="lanes"] Unit of values. Used for bar legend 
 * @param {Boolean} [showFirstInQueue=false] If first in queue project should be indicated visually
 */
function drawStackedBars (dataset, divID, width, height, unit, showFirstInQueue) {
    //console.log(dataset)
    var w = width,
        h = height,
        p = [30, 0, 30, 20], // t, r, b, l
        x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
        y = d3.scale.linear().range([0, h - p[0] - p[2]]),
        parse = d3.time.format("%m/%Y").parse,
        format = d3.time.format("%b");
    
    if (unit == undefined) { unit = "lanes"}
    var fixedDigits = 1;
    if (unit == "samples") { fixedDigits = 0; }

    // Get a handle to the tooltip div
    var tooltipDiv = d3.select(".tooltip");
    // Resize slightly for lane and sample information (done in mouseover code below)
    // width
    var tooltipWidth = tooltipDiv.style("width");
        // remove last two letters: "px" & turn into an integer
    tooltipWidth = parseInt(tooltipWidth.substring(0, tooltipWidth.length - 2));
    var tooltipNewWidth = tooltipWidth + 5;
    // height
    var tooltipHeight = tooltipDiv.style("height");
        // remove last two letters: "px" & turn into an integer
    tooltipHeight = parseInt(tooltipHeight.substring(0, tooltipHeight.length - 2));
    var tooltipRowHeight = "13"; // 13px per row
    var tooltipNewHeight = tooltipHeight - tooltipRowHeight;
    
    
    
    /*
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
                var col = d3.rgb("#5B87FF");
                if(i%2 == 0) { col = col.brighter(); }

                // Handle vis que regarding time since last prep start
                var dayLimit = 7;
                if (showFirstInQueue) {
                    if (d[0].daysSincePrepStart != undefined) {
                        if (d[0].daysSincePrepStart > dayLimit ) {
                            col = "red"
                        } else {
                            col = timeseriesColors[1];
                        }
                     }
                } 
                return col;

            }) 
            .style("stroke", function(d, i) {
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
            .on("mouseover", function(d) {
                // Make tooltip div visible and fill with appropriate text
                tooltipDiv.transition()		
                    .duration(200)		
                    .style("opacity", .9);		
                tooltipDiv.html(d.pid + "<br/>"
                                + parseFloat(d.y).toFixed(fixedDigits) + " " + unit
                                )	
                    .style("left", (d3.event.pageX) + "px")		
                    .style("top", (d3.event.pageY - 28) + "px")
                    .style("height", (tooltipNewHeight + "px"))
                    .style("width", (tooltipNewWidth + "px"))
                    ;	    
            })
            .on("mouseout", function(d) { //Remove the tooltip
                // Make tooltip div invisible
                tooltipDiv.transition()		
                .duration(200)		
                .style("opacity", 0)
                .style("height", (tooltipHeight + "px"))
                .style("width", (tooltipWidth + "px"))
                ;
            })
            .on("click", function(d) {
                     var projID = d.pid;
                     var url = "https://genomics-status.scilifelab.se/projects/" + projID;
                     window.open(url, "genomics-status");
            })
            ;
        
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
        rule.append("svg:line")
            .attr("x2", w - p[1] - p[3] + 10)
            .style("stroke", function(d) { return d ? "#fff" : "#000"; })
            .style("stroke-opacity", function(d) { return d ? .1 : null; });
        
        rule.append("svg:text")
            //.attr("x", w - p[1] - p[3] + 6)
            .attr("text-anchor", "end")
            .attr("x", -p[3] + 18)
            .attr("dy", ".35em")
            .text(d3.format(",d"))
            ;
    
}

/**
 * Code to draw a stacked barchart plot for RecCtrl load
 * @param {Array} dataset  Array of array of layer objects
 * @param {String} divID    Id of DOM div to where plot should reside
 * @param {Number} width    plot width
 * @param {Number} height   plot height
 */
function drawRCStackedBars (dataset, divID, width, height) {
    var w = width,
        h = height,
        p = [30, 10, 30, 20], // t, r, b, l
        x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
        y = d3.scale.linear().range([0, h - p[0] - p[2]]),
        parse = d3.time.format("%m/%Y").parse,
        format = d3.time.format("%b");

    // Get a handle to the tooltip div
    var tooltipDiv = d3.select(".tooltip");

        // Resize slightly for lane and sample information (done in mouseover code below)
    // height
    var tooltipHeight = tooltipDiv.style("height"); // original height
        // remove last two letters: "px" & turn into an integer
    tooltipHeight = parseInt(tooltipHeight.substring(0, tooltipHeight.length - 2));
    var tooltipRowHeight = "13"; // 13px per row

        
    // color scales
    // use colorbrewer color schemes
    // number of colors to use. NB! not all schemes have the same number of colors, see colorbrewer.js
    // Also, see colorbrewer2.org
    var num_colors = 9; 
    var color_scheme = colorbrewer.Blues[num_colors]; // array of colors defined in colorbrewer.js
    //var color_scheme = d3.scale.category20c(); // array of colors defined in d3.js
       
    
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
        .data(dataset)
        .enter().append("svg:g")
        .attr("class", "project")
        .style("stroke", function(d, i) {
            return "white";
        })
        ;

    // Add a rect for each .
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
        .style("fill", function(d, i) {
            return color_scheme[i + 2]; // make sure the chosen colorbrewer color space has num_colors defined
        }) 
        .on("mouseover", function(d) {
            // calculate how many rows are needed
            var ids = d.projects; //list of proj IDs
            var numIDs = (ids.split("P").length - 1); //count proj IDs
            var rows = Math.ceil(numIDs/2);
            var tooltipNewHeight = rows * tooltipRowHeight;
            
            // Make tooltip div visible and fill with appropriate text
            tooltipDiv.transition()		
                .duration(200)		
                .style("opacity", .9);		
            tooltipDiv.html(d.projects)	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 28) + "px")
                .style("height", (tooltipNewHeight + "px"))
                //.style("width", (tooltipNewWidth + "px"))
                ;	    
        })
        .on("mouseout", function(d) { //Remove the tooltip
            // Make tooltip div invisible
            tooltipDiv.transition()		
            .duration(100)		
            .style("opacity", 0)
            .style("height", (tooltipHeight + "px"))
            //.style("width", (tooltipWidth + "px"))
            ;
               //d3.select("#tooltipA").remove();
        })
        .on("click", function(d) {
                 alert("These " + d.y + " " + d.cat + " projects are currently in Reception control\n"+ d.projects)
                 
                 //var projID = d.pid;
                 //var url = "http://genomics-status.scilifelab.se/projects/" + projID;
                 //window.open(url, "genomics-status");
        })
        ;
    
    svg.selectAll("text")
        .data(dataset[0]) // all elements for the only bar
        .enter().append("svg:text")
        .attr("x", function (d, i) {
            return x(d.x) + (w - p[1] - p[3])/2;                
        })
        .attr("y", function (d, i) {
            var yPos = -y(d.y0) - y(d.y)/2 + 3;// position for offset value (y0) + half hight of layer
            return yPos; 
        })
        .attr("text-anchor", "middle")
        .text(function (d, i) {
            if(d.y > 0) { return d.cat + " (" + d.y + ")"; } else { return ""; }
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

    // Add y-axis rules.
    var rule = svg.selectAll("g.rule")
        .data(y.ticks(5))
        .enter().append("svg:g")
        .attr("class", "rule")
        .attr("transform", function(d) { return "translate(0," + -y(d) + ")"; });
    
    // horizontal lines. Add?
    rule.append("svg:line")
        .attr("x2", w - p[1] - p[3] + 5)
        .style("stroke", function(d) { return d ? "#fff" : "#000"; })
        .style("stroke-opacity", function(d) { return d ? .1 : null; });
    
    rule.append("svg:text")
        //.attr("x", w - p[1] - p[3] + 6)
        .attr("text-anchor", "end")
        .attr("x", -p[3] + 18)
        .attr("dy", ".35em")
        .text(d3.format(",d"))
        ;
}
