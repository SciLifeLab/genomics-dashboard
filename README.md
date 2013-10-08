genomics-dashboard
==================
Web app for visualizing key performance indicators for the SciLifeLab Genomics Production process.

The page interfaces with StatusDB; the CouchDB database instance we're using at SciLifeLab to store metadata in 
various forms.

--------------------------------------------------------

Dependencies
------------

**d3**
A directory `d3` must be added containing:

- [d3.v3.js](http://d3js.org/d3.v3.zip)
- [box.js](http://bl.ocks.org/mbostock/4061502) 

Additional info
---------------

To fetch data, `user:password` to statusdb must be specified in a file `user_cred.txt`
