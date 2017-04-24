# Megatrend & Intervention Impact Analyzer for Jobs
Team NSI Estonia submission for EUBD Hackathlon 2017 

## Team

* Innar Liiv
* Rain Öpik
* Toomas Kirt


## Application prototype

The prototype application can be viewed in a web browser. 
We recommend to use the latest version of [Google Chrome](https://www.google.com/chrome/browser/desktop/index.html). 

Note: Internet Explorer and Safari are not supported. The latest version of Firefox opens the app, but render performance is suboptimal. 


**[Click here to open the prototype application](https://rainopik.github.io/eubdhack-megatrend/)**

### How to use

#### Moving around and getting information

The application has two modes:

* **Move & zoom mode** - click and drag mouse to move the graph. Scroll mouse wheel to zoom in and out.

* **Query mode** - hover mouse over a node to display a small tooltip with demand and supply numbers. Hovering also highlights connected jobs and fades out the rest of the graph. 

Click <kbd>Right Mouse Button</kbd> to switch between Move and Query modes.

If the display does not show anything or you get stuck, please reload the page in browser (<kbd>F5</kbd> or <kbd>⌘</kbd> + <kbd>R</kbd>).


### Graph description

A node in the graph denotes a job. A job is linked to other jobs based on similarity - for each job we found top 3
jobs that have the largest number of overlapping skills. 

Nodes are colored to highlight the amount of job vacancies and jobseekers.  


The visualizer supports several layers:
* **Composite**
  * *Left half* of a node is colored by the number of vacancies available for that job (demand). *White* means no vacancies, 
*light pink* low and *red* denoting high demand. 
  * *Right half* is colored by number of job seekers who have listed this job in their desired job list. Color gradation is similar to 
  the left half.
  * Node is marked with a *yellow halo* when this job is affected by the Megatrend, i.e. job is in the list of jobs suspectible for automation / computerization [[1]](#ref1).

* **Demand + Supply**
  * This is basically the same visualization as *Composite*, except the Megatrend markers (*yellow halo*) are not drawn.

* **Highlight MegaTrend**
  * Node is colored red when the job is affected by the Megatrend. Non-affected jobs are colored white. 

* **Highlight Supply**
  * Node is colored red when at least one job seeker has listed this job in their desired job list. White nodes denote jobs that no-one desires.

* **Highlight Demand**
  * Node is colored red when this job is listed in at least one job vacancy. White nodes denote jobs with no demand.


#### Demand & supply imbalance:

Colors values for the left and right half (demand and supply) are normalized separately due to huge imbalance in EURES data. 
Some countries have no job seekers in EURES while showing lots of vacancies and vice versa.

The default mode (*Show imbalance* unchecked) will help to identify most demanded jobs - look for nodes with a bright red left half.
Similarly, jobs with the largest supply of seekers have a bright right half.
  
Tick the checkbox *Show imbalance* to normalize the colors to the same scale. This helps to visualize imbalance -
 when the left half of the node is brighter red compared to the right, this job has unsatisfied demand. Conversely, a brighter right half marks jobs with oversupply of job seekers.

Note: the EURES data contains huge discrepancies between supply and demand across different countries. 
Some countries have no job seekers in EURES while showing lots of vacancies and vice versa. Therefore the *Show imbalance* mode may reveal only the extremities.


## Data processing

### Processing pipeline

```
.----------------.     .----------------.     .----------------.     .--------------.     .---------------.
| 1. Hackathlon  |     | 2. Occupation  |     | 3. Export data |     | 4. Calculate |     | 5. Visualizer |
|   datasets in  | --> |  graph data in | --> |  to PSV files  | --> | graph layout | --> |       UI      |
| PostgreSQL and |     |   PostgreSQL   |  |  '----------------'  |  '--------------'  |  '---------------'
|   Apache Hive  |     '----------------'  |                      |                    |
'----------------'                         |                      |                    |
                                           + eubd.vis.g_node      + exp_node.psv       + vis_node.csv
                                           + eubd.vis.g_link      + exp_link.psv       + vis_link.csv
```
 
### 1. Datasets

* EURES CV and job vacancy dataset
* ESCO RDF, converted to relational structure suitable for SQL
* List of [Jobs Susceptible for Automation / Computerization (Oxford, 2017)](http://www.sciencedirect.com/science/article/pii/S0040162516302244)
* Occupation classifications mapping table from [Occupation classifications crosswalks - from O*NET-SOC to ISCO (2016)](http://ibs.org.pl/en/resources/occupation-classifications-crosswalks-from-onet-soc-to-isco/)


### 2. Occupation graph

A graph is defined by two entities:

* Node - denotes an ESCO occupation. Each occupation may have additional data attributes attached to it.
* Link - two nodes (occupations) are connected when they are similar to each other.

Therefore the occupation graph is based similarity between ESCO occupations. We decided to define similarity based on skill information 
in the ESCO RDF classifier.


#### *g_link* - linking similar occupations together

For a given ESCO occupation, we queried all skills that this occupation requires (relation type *essentialSkill* in RDF). 
Then we matched all ESCO occupations that require the same skills. This produces a mapping *ESCO occupation* --> *ESCO occupation* with a *similarity measure* 
that describes the ratio of shared skills between two occupations to number of all skills required by the first occupation.

Let's take two occupations: `00cee175-1376-43fb-9f02-ba3d7a910a58 - bus driver` and `e75305db-9011-4ee0-ab62-8d41a98f807e - private chauffeur` and 
enumerate all skills that are essential for both occupations.


| from_oc_key                          | to_oc_key                            | skill_in_from_oc     | skill_in_to_oc       |
| ------------------------------------ | ------------------------------------ | -------------------- | -------------------- |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | provide first aid | *N/A* |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | manoeuvre bus | *N/A* |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | *N/A* | maintain personal hygiene standards |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | *N/A* | park vehicles |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | drive in urban areas | drive in urban areas |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | keep time accurately | keep time accurately |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e | provide information to passengers | provide information to passengers |

The skills in this table can be divided into three groups:
* Skill that is only required for the first occupation (eg. `bus driver`)
* Skill that is only required for the second occupation (eg. `private chauffeur`)
* Skill that is required by both of these occupations.

When count the number of distinct skills that are required for both occupations (22 for this example) and divide it by the number of distinct skills required for the first occupation (35), 
we get a percentage of matching skills, which we can use as a similarity measure between these two occupations. 


The following table shows an example of the graph for two occupations: 

| from_oc_key                          | to_oc_key                            | skill_match_pct  | *comment*                                        |
| ------------------------------------ | ------------------------------------ | ---------------: | ------------------------------------------------ |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | 3a15ec1b-9250-41a0-9344-feb2956481b7 |             0.80 | *bus driver -> trolley bus driver*               | 
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | 03e02554-15d1-4697-960c-8909e7d36f7e |             0.77 | *bus driver -> tram driver*                      |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | e75305db-9011-4ee0-ab62-8d41a98f807e |             0.63 | *bus driver -> private chauffeur*                |
| ...                                  |                                      |                  |                                                  |
| 45037d43-a8f5-4f46-b332-b2935bc305f4 | c5d779f4-345b-4918-872b-a1cbaeb1d9be |             0.60 | *cargo vehicle driver -> dangerous goods driver* |
| 45037d43-a8f5-4f46-b332-b2935bc305f4 | 00cee175-1376-43fb-9f02-ba3d7a910a58 |             0.55 | *cargo vehicle driver -> bus driver*             |
| 45037d43-a8f5-4f46-b332-b2935bc305f4 | e75305db-9011-4ee0-ab62-8d41a98f807e |             0.45 | *cargo vehicle driver -> private chauffeur*      |
| ...                                  |                                      |                  |                                                  |

The resulting matrix is very large, as contains occupation pairs that are loosely connected by a very generic skill. 
For example, both `bus driver` and `physiotherapy assistant` have an `use different communication channels` as essential skill, which connects them in the graph.
However when we calculate the skill match ratio, we get a modest 0.02. Also the connection between these occupations does not make sense in real life, as it is difficult
to imagine that a person skilled in operating heavy vehicles could easily apply for a position that requires medical skills. 

Therefore we decided to prune the graph of weakly connected occupation pairs and take only 3 most similar occupations for every occupation.


---


#### *g_node* - annotating occupations with supply and demand data

Since each node in the occupation graph denotes ESCO occupation, we would like to know how this occupation will be affected by 
automation or computerization. The list of Jobs Suspectible for Automation [[1]](#ref1) originally has SOC occupation codes.
Mapping ISCO to SOC [[2]](#ref2) is unfortunately one-to-many, which means that some ISCO occupations (eg. `8332 - Heavy truck and lorry drivers`)
are assocaited with several SOC occupations (`53-1031 - Driver/Sales Workers` and `53-3032 - Heavy and Tractor-Trailer Truck Drivers`) that 
may have differing probabilities for automation (respectively `0.98` and `0.79`). To solve this ambiguity, we have calculated two probabilities, maximum and average.
  
After knowing, which jobs are going to impacted, we wanted to assess, how many people would be affected by this trend. 
Since we have based our tool on EURES CV and job vacancy dataset, we could handily calculate the number of vacancies 
and number of unique persons that have marked this occupation as their desired job.
 
However the amount of data in EURES dataset makes direct querying inefficient, therefore we decided to crete a special 
 denormalized (crosstab) table for storing occupation-based supply/demand counts by country. We used Apache Hive to run queries against EURES datasets and 
 imported the results back to SQL. 

For example, based on EURES data, there are 1925 job vacancies for 'bus driver' in Austria and 5 job seekers have marked 'bus driver' as their desired occupation. See table below:

**g_node**

| esco_oc_key                          | preflabel_en         | ox_max_prob | all_jv | all_cvdes | at_jv | at_cvdes | be_jv | be_cvdes | ... |
| ------------------------------------ | -------------------- | ----------: | -----: | --------: | ----: | -------: | ----: | -------: | --- |
| 00cee175-1376-43fb-9f02-ba3d7a910a58 | bus driver           | 0.89        | 53936  | 535       |  1426 |          | 1925  | 5        |     |
| 45037d43-a8f5-4f46-b332-b2935bc305f4 | cargo vehicle driver | 0.79        | 666061 | 1729      | 13305 | 14       | 35475 | 15       |     |
| ... | 


Explanation of columns in `g_node` table:

* esco_oc_key - ESCO occupation code .
* preflabel_en - Preferred occupation label in English.
* ox_max_prob - Probability of automation for this occupation.
* all_jv - total number of vacancies for this occupation.
* at_jv - number of vacancies in Austria (AT).
* at_be - number of vacancies in Belgium (BE).
* ...
* all_cvdes - total number of unique job seekers who have listed this occupation as their desired job.
* at_cvdes - number of job seekers in Austria who desire this job.
* be_cvdes - number of job seekers in Belgium who desire this job.
* ...



### 3. Export data to PSV files

We designed the visualizer tool to run without server backend and online connection to database. This makes it easy to host the tool
on a static website (like GitHub) without any running costs.

The final table of similar occupations (`g_link`) was exported to file [data/exp_link.psv](data/exp_link.psv)
and list of all nodes in the graph (`g_node`) was saved to file [data/exp_node.psv](data/exp_node.psv).



### 4. Calculate graph layout

Experience with d3.js have shown that real-time calculation of graph layout (the position of every node) may be slow for graphs with non-trivial structure.
The occupation graph has 2950 nodes and 8838 links and after some experimentation we decided to pre-calculate the positions of graph nodes.
 
We used the SFDP layout algorithm from Python [graph-tool](https://graph-tool.skewed.de/) for calculating the position of nodes and reindexing 
node identifiers to format that is suitable for visualizer.

The script [preprocess/convert_data.py](preprocess/convert_data.py) prepares data files for the Visualizer. 
It reads [data/exp_node.psv](data/exp_node.psv) and [data/exp_link.psv](data/exp_link.psv) and produces [data/vis_node.csv](data/vis_node.csv) and [data/vis_link.csv](data/vis_link.csv) files.  



### 5. Visualizer UI

Visualizer is built with [d3.js](https://d3js.org/), which renders a zoomable and scrollable SVG document for browsing the graph.
See [js/vis.js](js/vis.js) for details.


---


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



## References

* <a name="ref1"></a>\[1] Carl Benedikt Frey, Michael A. Osborne, ["The future of employment: How susceptible are jobs to computerisation?"](http://www.sciencedirect.com/science/article/pii/S0040162516302244), Technological Forecasting and Social Change, Volume 114, January 2017, Pages 254-280
* <a name="ref2"></a>\[2] Wojciech Hardy, David Autor, Daron Acemoglu, ["Occupation classifications crosswalks - from O*NET-SOC to ISCO"](http://ibs.org.pl/en/resources/occupation-classifications-crosswalks-from-onet-soc-to-isco/), 2016 \[Online]. Available at: http://ibs.org.pl/en/resources/occupation-classifications-crosswalks-from-onet-soc-to-isco/ 
