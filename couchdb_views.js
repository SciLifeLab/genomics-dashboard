function(doc) {
	var lims = (doc["source"] == "lims");
	var since_july = (doc["open_date"] >= "2013-07-01");
	var production = (doc["details"]["type"] == "Production");
	if(lims && since_july && production) {
		emit(doc["open_date"], [ doc["project_name"], doc["details"]["queued"] ]);
	}
};
