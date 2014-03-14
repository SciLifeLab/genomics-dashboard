function(doc) {
  var type = doc["details"]["type"];
  // Only output production documents
  //if(type != "Production") { exit; }

  // Get sequencing platform and application for stratification
  var sequencing_platform = doc["details"]["sequencing_platform"];
  var application = doc["application"];

  // Calculate lane load per sample
  var proj_lanes = doc["details"]["sequence_units_ordered_(lanes)"];
  var num_samples = doc.no_of_samples;
  var lanes_per_sample = proj_lanes/num_samples;


  // Find arrival date (if present)
  var open_date = "0000-00-00";
  if (doc["open_date"] > open_date) {
    open_date = doc["open_date"];
    //if(open_date < "2013-07-01") { exit; } // this filter should not be used
  }
  // Find all samples sequenced (if present)
  var ass = doc["details"]["all_samples_sequenced"];

  // Find all raw data delivered (if present)
  var all_raw_data_delivered = "0000-00-00";
  if (doc.details["all_raw_data_delivered"] > all_raw_data_delivered) {
    all_raw_data_delivered = doc.details["all_raw_data_delivered"];
  }

  // close date
  var close_date = "0000-00-00";
  if (doc["close_date"] > close_date) {
    close_date = doc["close_date"];
  }

  // Find aborted date (if present)
  var aborted_date = "0000-00-00";
  if (doc.details["aborted"] > aborted_date) {
    aborted_date = doc.details["aborted"];
  }

  // go through each sample
  for (sample in doc["samples"]){

    // Find Rec ctrl start
    var initial_qc_start = "0000-00-00";
    if(doc["samples"][sample]["first_initial_qc_start_date"] > initial_qc_start) { 
      initial_qc_start = doc["samples"][sample]["first_initial_qc_start_date"];
    }

    // library prep start date
    // NEW temp way to get lib prep start
    // This bit of code to be transferred to production server
    var lib_prep_start = "0000-00-00";
    if(doc["samples"][sample]["first_prep_start_date"]) {
      lib_prep_start = doc["samples"][sample]["first_prep_start_date"];
    }

    // final validation date for Library QC
    var final_validation = "0000-00-00";
    // sequence start date
    var sequence_start_date = "9999-99-99";
    // final sequence date
    var final_sequence_date = "0000-00-00";

    // Find queue date (if present)
    var queued = "0000-00-00";
    if (doc["details"]["queued"] > queued) {
      queued = doc["details"]["queued"];
    }
    
    // go through each lib prep for sample
    for (library_prep in doc["samples"][sample]["library_prep"]) {
      var LP = doc["samples"][sample]["library_prep"][library_prep]

      // This is the lib prep finish date before QC starts. Should not be used as final_validation
      //if(LP.prep_finished_date) {
      //  final_validation = LP.prep_finished_date
      //}

      // capture earliest lib prep start if not set at sample/first_prep_start_date
      // done above at sample level.
      // 
      if(LP["prep_start_date"]) {
        if (lib_prep_start == "0000-00-00") {
          lib_prep_start = LP["prep_start_date"];
        } else if (LP["prep_start_date"]<lib_prep_start) {
          lib_prep_start = LP["prep_start_date"];
        }
      }

      var passed_prep = (LP["prep_status"] == "PASSED");

      // Find QC library finish date by looking at the final library validation.
      // final_validation initialized at sample level
      for (lv in LP["library_validation"]) {
        var lib_val_fin = LP["library_validation"][lv]["finish_date"];
        if (passed_prep && lib_val_fin > final_validation) {
          final_validation = lib_val_fin;
        }
      }


      // Find sequence start date & final sequence date by looking at the first sequence start date & the last sequencing_finish_date
      // sequence_start_date initialized at sample level
      // final_sequence_date initialized at sample level
      for (sample_run_metrics in LP["sample_run_metrics"]) {
        // sequence start date
        if(sequence_start_date > LP["sample_run_metrics"][sample_run_metrics]["sequencing_start_date"]) {
          sequence_start_date = LP["sample_run_metrics"][sample_run_metrics]["sequencing_start_date"];
        }

        // sequence end date
        if (final_sequence_date < LP["sample_run_metrics"][sample_run_metrics]["sequencing_finish_date"]) {
          final_sequence_date = LP["sample_run_metrics"][sample_run_metrics]["sequencing_finish_date"];
        //} else if (final_sequence_date < LP["sample_run_metrics"][sample_run_metrics]["sequencing_run_QC_finished"]) { // some older(?) projects only have info on seq_run_QC_finished
        //  final_sequence_date = LP["sample_run_metrics"][sample_run_metrics]["sequencing_run_QC_finished"];
        }
      } // sequence

    } // library prep

    // sample status
    var status = doc["samples"][sample]["details"]["status_(manual)"];
    if(!status) { status = null; }

    // in the case final_sequence_date has not been set, and all samples sequenced date is available
    if(final_sequence_date == "0000-00-00" && ass != null) {
      final_sequence_date = ass;
    }
 
    if (sequence_start_date == "9999-99-99") { sequence_start_date = "0000-00-00"; }
    //NEW! Emit what we have all variables should be set before so will be ok at emit
    //if (!("library_prep" in doc["samples"][sample])) {
    var KPI = Object();
    KPI["Arrival date"] = open_date;
    KPI["Rec ctrl start"] = initial_qc_start;
    KPI["Queue date"] = queued;
    KPI["Lib prep start"] = lib_prep_start;
    KPI["QC library finished"] = final_validation;
    KPI["Sequencing start"] = sequence_start_date;
    KPI["All samples sequenced"] = final_sequence_date;
    KPI["All raw data delivered"] = all_raw_data_delivered;
    KPI["Close date"] = close_date;
    KPI["Aborted date"]  = aborted_date;
    KPI["Samples"] = 1;
    KPI["Lanes"] = lanes_per_sample;
    KPI["Status"] = status;
    
    emit([doc["project_id"], type, application, sequencing_platform, sample], KPI);
    
  } // sample

}