#Visualization logic

## Map-reduce views
The visualizations depend on a number of *statusdb* Couchdb map-reduce views from in the form of json strings accessible through a url on the form:

`http://<user>:<password>@tools.scilifelab.se:5984/<database>/_design/<design>/_view/<view>?[group_level=<n>][reduce=false]`

### KPI_applications

|parameter  | value                             |
|---------  |-----------------------------------|
|database   | project                           |
|design     | process_flow                      |
|view       | KPI_applications ([sofa view](http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/process_flow/_view/KPI_applications))           |
|group_level| 3 ([json](http://tools.scilifelab.se:5984/projects/_design/process_flow/_view/KPI_applications?group_level=3))                                |



####Map function simplified pseudo code
    For each project of type "Production"
    	For each sample
    		For each lib prep
    		
    		Emit:
    		[
    			application,  // reduce group level 1
    			project_name, // reduce group level 2
    			project_id,   // reduce group level 3
    			sample,       // reduce group level 4
    			lib_prep      // reduce group level 5
    		]:
    		{
    			Arrival date: open_date
    			Queue date: queued
    			QC library finished: last of library_validation->finish_date
    			All samples sequenced: last of sample_run_metrics->sequencing_finish_date

    		   /** 
    		     These dates are in the form YYYY-MM-DD. 
    		     If absent a date is set to 0000-00-00) 
    		    */
    		} 
####Reduce function simplified pseudo code
    For each line
    	return the latest date of each result date as the reduced value for a particular level 
    	unless there is a 0000-00-00 date
    		return 0000-00-00

### KPI

|parameter  | value                             |
|---------  |-----------------------------------|
|database   | project                           |
|design     | process_flow                      |
|view       | KPI ([sofa view](http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/process_flow/_view/KPI))           |
|group_level| 3 ([json](http://tools.scilifelab.se:5984/projects/_design/process_flow/_view/KPI?group_level=3))                                 |



####Map function simplified pseudo code
    For each project of type "Production"
    	For each sample
    		For each lib prep
    		
    		Emit:
    		[
    			sequencing_platform,  // reduce group level 1
    			project_name, // reduce group level 2
    			project_id,   // reduce group level 3
    			sample,       // reduce group level 4
    			lib_prep      // reduce group level 5
    		]:
    		{
    			Arrival date: open_date
    			Queue date: queued
    			QC library finished: last of library_validation->finish_date
    			All samples sequenced: last of sample_run_metrics->sequencing_finish_date

    		   /** 
    		     These dates are in the form YYYY-MM-DD. 
    		     If absent a date is set to 0000-00-00) 
    		    */
    		} 
####Reduce function simplified pseudo code
    For each line
    	return the latest date of each result date as the reduced value for a particular level 
    	unless there is a 0000-00-00 date
    		return 0000-00-00

###KPI1

|parameter  | value                             |
|---------  |-----------------------------------|
|database   | project                           |
|design     | kpi_external                      |
|view       | KPI1 ([sofa view](http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/kpi_external/_view/KPI1))           |
|reduce| false ([json](http://tools.scilifelab.se:5984/projects/_design/kpi_external/_view/KPI1?reduce=false))                                 |



####Map function simplified pseudo code
    For each project of type "Production"
    	For each sample    	
    		For each lib prep    			
    			if sample_run_metrics && dillution_and_pooling_start_date
    		
    	    	Emit:
    			[
    				dillution_and_pooling_start_date,  
    				application, 
    				sample
    			]:
    			incoming_QC_status /** True || False */

###KPI2

|parameter  | value                             |
|---------  |-----------------------------------|
|database   | project                           |
|design     | kpi_external                      |
|view       | KPI2 ([sofa view](http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/kpi_external/_view/KPI2))           |
|reduce| false ([json](http://tools.scilifelab.se:5984/projects/_design/kpi_external/_view/KPI2?reduce=false))                                 |



####Map function simplified pseudo code
    For each project of type "Production"
    	For each sample  	
    		For each lib prep
    			
    			if workset_setup
    		
    	    	Emit:
    			[
    				workset_setup, 
    				application, 
    				"library validation"->start_date, 
    				sample
    			]:
    			prep_status /** PASSED || FAILED */
###KPI3_1

|parameter  | value                             |
|---------  |-----------------------------------|
|database   | project                           |
|design     | kpi_external                      |
|view       | KPI3_1 ([sofa view](http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/kpi_external/_view/KPI3_1))           |
|reduce| false ([json](http://tools.scilifelab.se:5984/projects/_design/kpi_external/_view/KPI3_1?reduce=false))                                 |



####Map function simplified pseudo code
    For each project of type "Production"
    	ordered = sequencing_platform * sequence_units_ordered_(lanes) * "platform amount factor"
    	delivered = Sum of m_reads_sequenced For each sample  	
    		
    	Emit:
    	[
    		sequencing_finished, // date 
    		project_name, 
    	]:
    	[
    		sequencing_platform,
    		sequence_units_ordered_(lanes),
    		ordered, // amount
    		samples, // no. of
    		delivered,
    		delivered/ordered
    	]

## Dataset generation

### Ongoing projects today 

*This section needs at complete re-write for the stacked load barcharts*

### Total delivery times runchart & boxplot

**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection)

Calculates the time difference in days between *dateFromKey* and *dateToKey* for projects active between *dateRangeStart* and *dateRangeEnd* [that has [the inverse of] *filter* as the first value in the json key].

Returns a list of [time diff, project name, done date, project id]

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection)

Calculates the time difference in days between *dateFromKey* and *dateToKey* for projects active between *dateRangeStart* and *dateRangeEnd* [that has [the inverseSelection of] *filter* as the first value in the json key].

Returns a list of time diff

#### Stratifications
##### All projects
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced

##### Library prep projects
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: Finished library
	inverseSelection: true

##### Finished library project
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: Finished library
	inverseSelection: false
	
##### HiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: HiSeq
	
##### MiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: MiSeq

### Rec control delivery times runchart & boxplot
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: Queue date


### Lib prep delivery times runchart & boxplot
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

**View**: KPI_applications

	dateRangeStart: Queue date
	dateRangeEnd: QC library finished

### Sequencing delivery times runchart & boxplot
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

#### Stratifications
##### All projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced

##### HiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: HiSeq
	
##### MiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: MiSeq

### Reception control - number of failed samples that are progressed barchart
**View**: KPI1

**Function**: generateFailedProgressedDataset(data, cmpDate)

Bins samples on sequencing_start date in three 4-week bins until cpmDate. Returns (#samples failed in rec ctrl that has a sequencing start date)/(all samples with sequencing start date) for each bin

### Library prep - fraction failed samples/workset runchart & boxplot
**View**: KPI2

**Function**: generateWorksetFailureDataset (jsonview, dateRangeStart, dateRangeEnd, filter)

Calculates the fraction of failed samples for worksets active between *dateRangeStart* and *dateRangeEnd* [that has *filter* as the first value in the json key].

Returns list of [fraction failed, workset, date, total number of samples]

**Function**: generateGenericBoxDataset (dataset, index)
Returns a list of values that has *index* in the specified *dataset* (a list of lists)

 
### Seq - data delivered / data ordered runchart & boxplot
**View**: KPI3_1

**Function**: generateDeliveredDataDataset (jsonview, dateRangeStart, dateRangeEnd)

Selects data for projects active between *dateRangeStart* and *dateRangeEnd*.

Returns list of [fraction delivered, project name, date, platform, ordered lanes, # samples, data amount delivered]

**Function**: generateGenericBoxDataset (dataset, index) **See *Library prep - fraction failed samples/workset* above**



