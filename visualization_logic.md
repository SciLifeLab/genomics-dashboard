#Visualization logic
The visualizations depend on a number of Couchdb map-reduce views from in the form of json strings accessible through a url on the form:

`http://<user>:<password>@tools.scilifelab.se:5984/<database>/_design/<design>/_view/<view>[?group_level=<n>]`

## Customer demand
### Map reduce views
|parameter| value                             |
|---------|-----------------------------------|
|database | project                           |
|design   | process_flow                      |
|view     | KPI_applications|

Term
: Definition

sofa view
: asdfa

<http://tools.scilifelab.se:5984/_utils/database.html?projects/_design/process_flow/_view/KPI_applications>|

    For each project of type "Production"
    	For each sample
    		For each lib prep
    		
    		Emit:
    		[application, project_name, project_id, sample, lib_prep]:
    		{
    			Arrival date:
    			Queue date:
    			QC library finished:
    			All samples sequenced:
    		}




|view     | KPI?group_level=**3**             |





## Ongoing projects today
## Total delivery times
## Rec control delivery times
## Lib prep delivery times
## Sequencing delivery times
## Reception control - number of failed samples that are progressed
## Library prep - fraction failed samples/workset
## Seq - data delivered / data ordered


