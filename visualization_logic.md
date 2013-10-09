#Visualization logic

## Map-reduce views
The visualizations depend on a number of *statusdb* Couchdb map-reduce views from in the form of json strings accessible through a url on the form:

`http://<user>:<password>@tools.scilifelab.se:5984/<database>/_design/<design>/_view/<view>[?group_level=<n>]`

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


## Customer demand
**View**: KPI_applications

**Function**: generateDemandDataset(data, cmpDate)

Bins projects on Arrival date in three 4-week bins until cpmDate. Returns weekly averages for each bin
 

## Ongoing projects today
**View**: KPI_applications

**Function**: generateBarchartDataset(data, cmpDate)

Bins projects to these process steps depending on presence of dates
    
    /**
     * Rec ctrl		=	Arrival date to Queue date
     * Lib prep 	= 	Queue date to QC library finished
     * Seq 			= 	QC library finished to All samples sequenced
     */

Returns number of projects for each bin

## Total delivery times

**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection)

Calculates the time difference in days between *dateFromKey* and *dateToKey* for projects active between *dateRangeStart* and *dateRangeEnd* [that has [the inverse of] *filter* as the first value in the json key].

Returns a list of [time diff, project name, done date, project id]

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection)

Calculates the time difference in days between *dateFromKey* and *dateToKey* for projects active between *dateRangeStart* and *dateRangeEnd* [that has [the inverseSelection of] *filter* as the first value in the json key].

Returns a list of time diff

### Stratifications
#### All projects
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced

#### Library prep projects
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: Finished library
	inverseSelection: true

#### Finished library project
**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: Finished library
	inverseSelection: false
	
#### HiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: HiSeq
	
#### MiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: MiSeq

## Rec control delivery times
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

**View**: KPI_applications

	dateRangeStart: Arrival date
	dateRangeEnd: Queue date


## Lib prep delivery times
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

**View**: KPI_applications

	dateRangeStart: Queue date
	dateRangeEnd: QC library finished

## Sequencing delivery times
**Function runchart**: generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection). **See *Total delivery times* above**

**Function boxplot**: generateBoxDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, filter, inverseSelection) **See *Total delivery times* above**

### Stratifications
#### All projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced

#### HiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: HiSeq
	
#### MiSeq projects
**View**: KPI

	dateRangeStart: Arrival date
	dateRangeEnd: All samples sequenced
	filter: MiSeq

## Reception control - number of failed samples that are progressed
## Library prep - fraction failed samples/workset
## Seq - data delivered / data ordered


