function(doc) {
	var lims = (doc["source"] == "lims");
	var since_july = (doc["open_date"] >= "2013-07-01");
	var production = (doc["details"]["type"] == "Production");
	if(lims && since_july && production) {
		emit(doc["open_date"], [ doc["project_name"], doc["details"]["queued"] ]);
	}
};
/** A LOT OF VIEWS MISSING!!!! */

/**
 * Problem KPI "3": Amount delivered / amount ordered per project
 *
 */
// trying new variant KPI3_1
function(doc) {
	if(doc["details"]["type"] != "Production") {exit;}
    
    var pf = doc["details"]["sequencing_platform"];
    var lanes = doc["details"]["sequence_units_ordered_(lanes)"];
    var samples = doc["no_of_samples"];
    var ordered = 0;
    if(pf.indexOf("MiSeq") != -1) {
        ordered = lanes * 10; // 10 million/lane for MiSeq
    } else if (pf.indexOf("High Output") != -1) {
        ordered = lanes * 143; // 143 million/lane for High Output
    } else if (pf.indexOf("Rapid") != -1) {
        ordered = lanes * 114; // 114 million/lane for Rapid
    }
    
    var delivered = 0;
    for (sample in doc["samples"]) {
        s = doc["samples"][sample];
        delivered += parseFloat(s['m_reads_sequenced']);
    }
    var fraction = delivered / ordered;
    
    emit([doc["sequencing_finished"],doc["project_name"]], [pf, lanes, ordered, samples, delivered, fraction ]);
}