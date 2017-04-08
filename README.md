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



## Datasets

WIP...


## Built with

WIP...


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## References

* <a name="ref1"></a>\[1] Carl Benedikt Frey, Michael A. Osborne, ["The future of employment: How susceptible are jobs to computerisation?"](http://www.sciencedirect.com/science/article/pii/S0040162516302244), Technological Forecasting and Social Change, Volume 114, January 2017, Pages 254-280
* <a name="ref2"></a>\[2] Wojciech Hardy, David Autor, Daron Acemoglu, ["Occupation classifications crosswalks - from O*NET-SOC to ISCO"](http://ibs.org.pl/en/resources/occupation-classifications-crosswalks-from-onet-soc-to-isco/), 2016 \[Online]. Available at: http://ibs.org.pl/en/resources/occupation-classifications-crosswalks-from-onet-soc-to-isco/ 
