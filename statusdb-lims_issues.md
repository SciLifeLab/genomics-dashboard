# Statusdb/LIMS issues #
***2014-01-13***

## Queue ##

### RNA ###

* P576

	missing close date in statusdb

* P653

	missing close date in statusdb

* P672

	missing close date in statusdb

### Other ###

* P570 - **OK**

	Needs fix in map-reduce view. Added change to production
        
## Ongoing - Libprep ##

### DNA ###

* P847

	missing `samples/*/library_prep/*/library_validation/*/finish_date`
    
### RNA ###

* P680

	23 samples not passed libQC. OK(?)
        
* P681

	63 samples not passed libQC. OK(?)

* P682

	34 samples not passed libQC. OK(?)
        
* P806

	3 samples not passed libQC. OK(?)

### SeqCap ###

* P843

	dev: 1 sample not passed libQC. => 5 samples in seq
	
	In current prod has all 6 samples in libprep
        
* P853

	dev: 1 sample not passed libQC. => 10 samples in seq
	
	In current prod has all 11 samples in libprep
        
* P869

	dev: 2 sample not passed libQC. => 46 samples in seq
	
	In current prod has all 48 samples in libprep
        
## Ongoing - Seq ##

* P680

	See Ongoing - Libprep above

	Visible in current prod, but not in dev (where they are in Libprep)
        
* P847

	See Ongoing - Libprep above
	
	dev: ongoing; prod: seq
	
	missing `samples/*/library_prep/*/library_validation/*/finish_date`
        
* P936

	`samples/*/library_prep/*/sample_run_metrics/*/sequencing_run_QC_finished` set even if seq run not finished.
	Use of `sequencing_run_QC_finished` as a way to get at seq done date for older (?) projects that lack 
	`samples/*/library_prep/*/sample_run_metrics/*/sequencing_finish_date`
	Maybe we can't use this? Data for old projects will have to be fixed...

        
       
        
        