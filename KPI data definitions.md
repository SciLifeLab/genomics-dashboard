#KPI data definitions

##Statusdb map-reduce view mapping
[http://tools.scilifelab.se:5984/_utils/database.html?projects](http://tools.scilifelab.se:5984/_utils/database.html?projects)

###Emitted view names - project key names
**Map-reduce view name**:	genomics-dashboard/dates_and_load_per_sample

| Map-reduce view part | statusdb view name                  | statusdb project key name                                              | aggregate choice | comment                                                       |
|----------------------|-------------------------------------|------------------------------------------------------------------------|------------------|---------------------------------------------------------------|
| key                  | "Project ID" (key index 0)          | `project_id`                                                           |                  |                                                               |
| key                  | "Project type" (key index 1)        | `details/type`                                                         |                  |                                                               |
| key                  | "Application" (key index 2)         | `application`                                                          |                  |                                                               |
| key                  | "Sequencing platform" (key index 3) | `details/sequencing_platform`                                          |                  |                                                               |
| key                  | "Sample ID" (key index 4)           | `samples/*`                                                            |                  |                                                               |
| value                | Arrival date                        | `open_date`                                                            |                  |                                                               |
| value                | Rec ctrl start                      | `samples/*/first_initial_qc_start_date`                                | earliest         |                                                               |
| value                | Queue date                          | `details/queued`                                                       |                  |                                                               |
| value                | Lib prep start                      | `samples/*/library_prep/*/prep_start_date`                             | earliest         |                                                               |
| value                | QC library finished                 | `samples/*/library_prep/*/library_validation/*/finish_date`            | latest           |                                                               |
| value                | Sequencing start                    | `samples/*/library_prep/*/sample_run_metrics/*/sequencing_start_date`  | earliest         |                                                               |
| value                | All samples sequenced               | `samples/*/library_prep/*/sample_run_metrics/*/sequencing_finish_date` | latest           | Better to name this Sample sequenced for view at sample level |
| value                | Close date                          | `close_date`                                                           |                  |                                                               |
| value                | Samples                             | `1`                                                                    |                  |                                                               |
| value                | Lanes                               | `details/sequence_units_ordered_(lanes) / no_of_samples`               |                  | In future change to: divide by `final_no_of_samples`          |

##Visualizations
[http://genomics-dashboard.scilifelab.se](http://genomics-dashboard.scilifelab.se)
###Ongoing work stacked bar charts	
***Load is calculated at sample level***

| Load step          |                        | Logic                                                                                                 |
|--------------------|------------------------|-------------------------------------------------------------------------------------------------------|
| Rec ctrl           |                        | `Arrival date != 0000-00-00 && Queue date == 0000-00-00`                                              |
| Queue Lib prep     |                        | `Queue date != 0000-00-00 && (Lib prep start == 0000-00-00 && QC library finished == 0000-00-00)`     |
| Queue Fin library  |                        | `Queue date != 0000-00-00 && (Sequencing start == 0000-00-00 && All samples sequenced == 0000-00-00)` |
| Ongoing Lib prep   |                        | `Lib prep start != 0000-00-00 && QC library finished == 0000-00-00`                                   |
| Ongoing Sequencing |*Lib prep proj*         | `QC library finished != 0000-00-00 && All samples sequenced == 0000-00-00`                            |
| Ongoing Sequencing |*Finished library proj* | `Sequencing start != 0000-00-00 && All samples sequenced == 0000-00-00`                               |

###Delivery time run charts	
***Times are calculated using project level data***

| Delivery times chart       |                      | Current logic                                | Future logic                                               |
|----------------------------|----------------------|----------------------------------------------|------------------------------------------------------------|
| Total delivery times       |                      | Queue date to All samples sequenced          | Library prep start (or First in queue date?) to Close date |
| Rec control delivery times |                      | Arrival date to Queue date                   | Add: Rec Ctrl start to Queue date                          |
| Lib prep delivery times    |                      | Queue date to QC library finished            | Library prep start to QC library finished                  |
| Sequencing delivery times  | *Lib prep projects*  | QC library finished to All samples sequenced | *same*                                                       |
| Sequencing delivery times  |*Fin library projects*| Queue date to All samples sequenced          | First in queue date to All samples sequenced               |
| Data delivery times        |                      | -                                            | All samples sequenced to Close date                        |	