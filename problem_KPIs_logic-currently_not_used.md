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