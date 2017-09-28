(function(window, document, $) {
    var app = window.app = window.app || {};
    app.vis = app.vis || {};

    app.vis = $.extend(app.vis, {
        g: {
            rootGoup: null,
            nodeDotGroup: null,
            nodeSectorGroup: null,
            nodeHaloGroup: null,
            nodeCareerGroup: null,
            linkGroup: null,
            linkCareerGroup: null,
            nodeLabelGroup: null,
            nodeCareerLabelGroup: null,
            zoomGroup: null,

            colorScaleLeft: null,
            colorScaleRight: null,

            zoom: null,

            tip: null
        },

        config: {
            width: null,
            height: null,
            canvasSize: null,

            nodeFile: "data/vis_node.csv",
            linkFile: "data/vis_link.csv",
            countries: {},

            zoom: {
                initial: {
                    x: null,
                    y: null,
                    scale: null
                },
                current: {
                    x: null,
                    y: null,
                    scale: null
                }
            },
            mouseMode: "move"
        },

        data: {
            nodes: null,
            links: null,
            adj: {}
        },

        stats: {
            max: {
                supply: null,
                demand: null,
                both: null
            }
        },

        params: {
            country: "all",
            imagetype: "composite",     // composite, demandsupply, supply, demand, megatrend
            category: "all",
            labels: false,
            imbalance: false,
            scatter: 4,
            probThreshold: 0.9
        },

        init: function() {
            app.vis.initViewPort();
            app.vis.initEvents();
            app.vis.initParams();
            app.vis.load();
        },

        initViewPort: function() {
            var totalHeight = $(window).height();
            var paramsHeight = $(".params-container").outerHeight();

            var svgHeight = totalHeight - paramsHeight - 5;
            $(".svg-container").css("height", svgHeight + "px");
        },

        initEvents: function() {
            var v = app.vis;

            $(document).foundation();

            $(document).on("change", '.action_change_params select,input[type="radio"],input[type="range"]', function() {
                var name = $(this).attr("name");
                var value = $(this).val();
                v.changeParam(name, value);
            });

            $(document).on("change", '.action_change_params input[type="checkbox"]', function() {
                var name = $(this).attr("name");
                var value = $(this).prop("checked");
                v.changeParam(name, value);
            });

            $(document).on("click", ".action_reset_zoom", function() {
                v.zoomReset();
            });

            $(document).on("click", ".action-toggle-mousemode", function() {
                v.toggleMouseMode();
            });

            $(window).resize(function() {
                v.initViewPort();
            });

            $(document).on("click", ".action-career-path-find", function() {
                v.careerPath.find();
            });

            $(document).on("click", ".action-clear-career-path", function() {
                v.careerPath.clear();
            });

            $(document).on('open.zf.reveal', "#career-path-modal", function() {
                $(this).find('.errors').empty();
            });
        },

        initParams: function() {
            var v = app.vis;

            v.config.countries = {};
            $.each( $("select[name='country'] option"), function() {
                var code = $(this).attr('value');
                var name = $(this).text();

                v.config.countries[code] = name;
            });
        },

        careerPath: {
            current: {
                source: null,
                target: null,
                path: [],
                nodes: []
            },

            empty: function() {
                return {
                    source: null,
                    target: null,
                    path: [],
                    nodes: []
                };
            },

            init: function() {
                var cp = app.vis.careerPath;

                cp.current = cp.empty();
                cp.initCalculator();
                cp.initSelect();
            },

            initCalculator: function() {
                app.vis.careerPath.calculator = new ShortestPathCalculator(app.vis.data.nodes, app.vis.data.links);
            },

            initSelect: function() {
                var data = $.map(app.vis.data.nodes, function(d) { return {id: d.index, text: d.preflabel_en} });
                data.sort(function(a, b) { return a.text.localeCompare(b.text); });
                data.unshift({id: -1, text: ''});

                $('.occupation-selector').select2({
                    data: data
                });

                // $('[name="career_from"]').val(10).trigger('change');
                // $('[name="career_to"]').val(100).trigger('change');
            },

            find: function() {
                var from = $('[name="career_from"]').val();
                var to = $('[name="career_to"]').val();

                if (from < 0) {
                    return app.vis.careerPath.error('Please choose a starting occupation');
                }
                if (to < 0) {
                    return app.vis.careerPath.error('Please choose a destination occupation');
                }
                if (from === to) {
                    return app.vis.careerPath.error('Cannot use same start and destination');
                }

                app.vis.careerPath.findPath(from, to);
            },

            findPath: function(from, to) {
                var cp = app.vis.careerPath;

                var shortestPath = cp.calculator.findRoute(from, to);

                if (shortestPath.mesg !== "OK") {
                    cp.current = cp.empty();

                    var message = '';

                    switch (shortestPath.mesg) {
                        case "No path found":
                            message = "Cannot find career path between selected occupations.";
                            break;

                        default:
                            message = shortestPath.mesg;
                            break;
                    }

                    return cp.error(message);
                }

                $('#career-path-modal').foundation('close');

                cp.current = shortestPath;
                cp.current.nodes = [];

                for (var i = 0; i < shortestPath.path.length; i++) {
                    cp.current.nodes.push(shortestPath.path[i].source);
                    cp.current.nodes.push(shortestPath.path[i].target);
                }

                app.vis.draw();

                $('.action-clear-career-path').removeClass('hidden');
            },

            clear: function() {
                app.vis.careerPath.current = app.vis.careerPath.empty();
                app.vis.draw();

                $('.action-clear-career-path').addClass('hidden');
            },

            error: function(message, title) {
                title = typeof(title) === 'undefined' ? 'Error' : title;
                var template = '<div class="callout small alert">\n' +
                    '  <h5>' + title + '</h5>\n' +
                    '  <p>' + message + '</p>\n' +
                    '</div>';

                $('#career-path-modal .errors').empty().append(template);
            },

            calculator: null
        },

        changeParam: function(name, value) {
            app.vis.params[name] = value;

            app.ui.spinnerStart();
            setTimeout(function() {
                app.vis.draw();
                app.ui.spinnerStop();
            }, 0);
        },

        readNodeFile: function() {
            var v = app.vis;
            var defer = Q.defer();

            var numRegex = new RegExp("(_jv|_cvdes|_cvlast|_prob)$");
            var numProps = ["index", "fx", "fy"];

            d3.tsv(v.config.nodeFile,
                function(row) {
                    for (var key in row) {
                        if (row.hasOwnProperty(key)) {
                            if (numRegex.test(key) || numProps.indexOf(key) >= 0) {
                                var numVal = parseFloat(row[key]);
                                if (isNaN(numVal)) {
                                    numVal = null;
                                }
                                row[key] = numVal;
                            }
                        }
                    }
                    row.fixed = true;

                    row["megatrend"] = false;
                    row["megatrend_prob"] = null;
                    if (row["ox_max_prob"] >= v.params.probThreshold) {
                        row["megatrend"] = true;
                        row["megatrend_prob"] = row["ox_max_prob"];
                    }

                    return row;
                },
                function(err, data) {
                    console.log('Read nodes');
                    v.data.nodes = data;
                    defer.resolve(data);
                }
            );
            return defer.promise;
        },

        readLinkFile: function() {
            var v = app.vis;
            var defer = Q.defer();
            d3.tsv(v.config.linkFile,
                function(row) {
                    row.source = parseFloat(row.source);
                    row.target = parseFloat(row.target);

                    if (!v.data.adj[row.source]) {
                        v.data.adj[row.source] = [];
                    }
                    v.data.adj[row.source].push(row.target);

                    if (!v.data.adj[row.target]) {
                        v.data.adj[row.target] = [];
                    }
                    v.data.adj[row.target].push(row.source);

                    return row;
                },
                function(err, data) {
                    console.log('Read links');
                    v.data.links = data;
                    defer.resolve();
                }
            );
            return defer.promise;
        },

        load: function() {
            v = app.vis;

            app.ui.spinnerStart();

            Q.all([v.readNodeFile(), v.readLinkFile()]).then(function() {
                app.ui.spinnerStop();
                v.careerPath.init();
                v.draw();
            });
        },

        getZoomIdentityTransform: function() {
            var c = app.vis.config;
            return d3.zoomIdentity.translate(c.zoom.initial.x, c.zoom.initial.y).scale(c.zoom.initial.k);
        },

        getZoomIdentityString: function() {
            var c = app.vis.config;
            return "translate(" + c.zoom.initial.x + ", " + c.zoom.initial.y + ") scale(" + c.zoom.initial.k + ", " + c.zoom.initial.k + ")";
        },

        getZoomCenterTransform: function() {
            var c = app.vis.config;
            return d3.zoomIdentity.translate(c.zoom.initial.x, c.zoom.initial.y).scale(c.zoom.current.k);
        },

        zoomReset: function() {
            var g = app.vis.g;
            var newTransform = v.getZoomIdentityTransform();

            g.zoomGroup
                .call(g.zoom)
                .call(g.zoom.transform, newTransform);
            g.rootGroup
                .call(v.g.zoom.transform, newTransform);
        },

        zoomCenter: function() {
            app.vis.g.rootGroup.call(v.g.zoom.transform, v.getZoomCenterTransform());
        },

        clear: function() {
            app.vis.g = {};
            $("svg").empty();
        },

        draw: function() {
            console.log("Draw starting");

            var v = app.vis;
            var g = app.vis.g;
            var c = app.vis.config;
            var p = app.vis.params;

            var svg = v.g.svg = d3.select("svg");
            var svgSize = svg.node().getBoundingClientRect();

            c.width = svgSize.width;
            c.height = svgSize.height;
            c.canvasSize = d3.min([c.width, c.height]) * p.scatter;

            // Scale layout coordinates
            vx = d3.extent(app.vis.data.nodes, function(d) { return d.fx; });
            vy = d3.extent(app.vis.data.nodes, function(d) { return d.fy; });

            var scaleX = d3.scaleLinear().domain(vx).range([-c.canvasSize / 2, c.canvasSize / 2]);
            var scaleY = d3.scaleLinear().domain(vy).range([-c.canvasSize / 2, c.canvasSize / 2]);


            var minZoomScale = 1 / 4;
            var maxZoomScale = 4;

            // Initial translation and scale:
            c.zoom.initial = {
                x: (c.width / 2),
                y: (c.height / 2),
                k: minZoomScale
            };

            if (!g.zoomGroup) {
                g.zoom = d3.zoom()
                    .scaleExtent([minZoomScale, maxZoomScale])
                    .on("zoom", v.onZoom)
                    .on("start", v.onZoomStart)
                    .on("end", v.onZoomEnd)
                ;

                var initialTransform = v.getZoomIdentityTransform();

                g.zoomGroup = svg.append("rect")
                    .attr("width", c.canvasSize)
                    .attr("height", c.canvasSize)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    .call(g.zoom)
                    .call(g.zoom.transform, initialTransform)
                    .on("contextmenu", v.toggleMouseMode)
                    .on("click", v.toggleMouseMode)
                ;
                c.zoom.current = initialTransform;
            }

            if (!g.rootGroup) {
                g.rootGroup = svg.append("g")
                    .attr("transform", v.getZoomIdentityString())
                    .on("contextmenu", v.toggleMouseMode)
                ;
                g.rootGroup.append("rect")
                    .attr("x", -c.canvasSize / 2)
                    .attr("y", -c.canvasSize / 2)
                    .attr("width", c.canvasSize)
                    .attr("height", c.canvasSize)
                    .attr("fill", "transparent")
                    .attr("stroke", "#777")
                    .attr("pointer-events", "none")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "20, 20")
                    .on("contextmenu", v.toggleMouseMode)
                ;
            }
            if (!g.linkGroup) {
                g.linkGroup = g.rootGroup.append("g");
            }
            if (!g.nodeDotGroup) {
                g.nodeDotGroup = g.rootGroup.append("g");
            }
            if (!g.nodeSectorGroup) {
                g.nodeSectorGroup = g.rootGroup.append("g");
            }
            if (!g.nodeHaloGroup) {
                g.nodeHaloGroup = g.rootGroup.append("g");
            }
            if (!g.linkCareerGroup) {
                g.linkCareerGroup = g.rootGroup.append("g");
            }
            if (!g.nodeCareerGroup) {
                g.nodeCareerGroup = g.rootGroup.append("g");
            }
            if (!g.nodeLabelGroup) {
                g.nodeLabelGroup = g.rootGroup.append("g");
            }
            if (!g.nodeCareerLabelGroup) {
                g.nodeCareerLabelGroup = g.rootGroup.append("g");
            }

            v.setMouseMode();

            g.tip = d3.tip()
                .attr("class", "infotip")
                .html(function(d) {
                    res = "";
                    res += "<div>Occupation: <strong>" + d["preflabel_en"] + "</strong></div>";
                    res += "<div>Category: <strong>" + d["isco_preflabel_l1"] + "</strong></div>";
                    res += "<br>";

                    var attrNameSupply = p.country + '_cvdes';
                    var attrNameDemand = p.country + '_jv';

                    switch (p.imagetype) {
                        case "composite":
                        case "demandsupply":
                        case "demand":
                        case "supply":
                            res += "<div><u>" + v.config.countries[p.country] + "</u></div>";
                            break;
                    }
                    switch (p.imagetype) {
                        case "composite":
                        case "demandsupply":
                        case "demand":
                            if (d[attrNameDemand]) {
                                res += "<div>Demand: <strong>" + d[attrNameDemand] + "</strong></div>";
                            } else {
                                res += "<div>No demand</div>";
                            }
                            break;
                    }
                    switch (p.imagetype) {
                        case "composite":
                        case "demandsupply":
                        case "supply":
                            if (d[attrNameSupply]) {
                                res += "<div>Supply: <strong>" + d[attrNameSupply] + "</strong></div>";
                            } else {
                                res += "<div>No supply</div>";
                            }
                            break;

                    }
                    switch (p.imagetype) {
                        case "composite":
                        case "megatrend":
                            if (d["megatrend"]) {
                                res += "<div><strong>Impacted by megatrend</strong>, p=" + d["megatrend_prob"] + "</div>";
                            }
                            break;
                    }

                    return res;
                })
                .direction('s')
                .offset([10, 0])
            ;
            svg.call(g.tip);



            v.stats.max.demand = d3.max(v.data.nodes, function(d) { return d[p.country + "_jv"];});
            v.stats.max.supply = d3.max(v.data.nodes, function(d) { return d[p.country + "_cvdes"];});
            v.stats.max.both = d3.max([v.stats.max.supply, v.stats.max.demand]);

            var maxLeft = p.imbalance ? v.stats.max.both : v.stats.max.demand;
            var maxRight = p.imbalance ? v.stats.max.both : v.stats.max.supply;

            v.g.colorScaleLeft = d3.scaleQuantize().domain([0, maxLeft]).range(['#FFB3B3', '#FF8686', '#FF5959', '#FF2C2C', '#FE0000', '#FF0000']);
            v.g.colorScaleRight = d3.scaleQuantize().domain([0, maxRight]).range(['#FFB3B3', '#FF8686', '#FF5959', '#FF2C2C', '#FE0000', '#FF0000']);

            // v.g.colorScaleLeft = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, v.stats.max.supply]);
            // v.g.colorScaleRight = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, v.stats.max.demand]);

            g.rootGroup
                .attr("class", "root")
            ;
            g.linkGroup
                .attr("class", "link")
            ;
            g.nodeDotGroup
                .attr("class", "nodedot")
            ;
            g.nodeSectorGroup
                .attr("class", "nodesector")
                .attr("display", function() {
                    switch (v.params.imagetype) {
                        case "composite":
                        case "demandsupply":
                            return "inline";
                        default:
                            return "none";
                    }
                })
            ;
            g.nodeHaloGroup
                .attr("class", "nodehalo")
                .attr("display", function() {
                    return v.params.imagetype === "composite" ? "inline" : "none";
                })
            ;
            g.linkCareerGroup
                .attr("class", "linkcareer")
                .attr("pointer-events", "none")
            ;
            g.nodeCareerGroup
                .attr("class", "nodecareer")
            ;
            g.nodeLabelGroup
                .attr("class", "nodelabel")
                .attr("pointer-events", "none")
            ;
            g.nodeCareerLabelGroup
                .attr("class", "nodecareerlabel")
                .attr("pointer-events", "none")
            ;

            var linkElems = g.linkGroup.selectAll("line")
                .data(v.data.links)
            ;
            linkElems.enter()
                .append("line")
                .attr("x1", function(d) { return scaleX(v.data.nodes[d.source].fx); })
                .attr("y1", function(d) { return scaleY(v.data.nodes[d.source].fy); })
                .attr("x2", function(d) { return scaleX(v.data.nodes[d.target].fx); })
                .attr("y2", function(d) { return scaleY(v.data.nodes[d.target].fy); })
                .attr("si", function(d) { return d.source; })
                .attr("ti", function(d) { return d.target; })
                .attr("display", v.getLinkVisiblity)
            ;
            linkElems.transition()
                .duration(0)
                .attr("display", v.getLinkVisiblity)
            ;
            linkElems.exit()
                .remove()
            ;


            var linkCareerElems = g.linkCareerGroup.selectAll("line")
                .data(v.data.links)
            ;
            linkCareerElems.enter()
                .append("line")
                .attr("x1", function(d) { return scaleX(v.data.nodes[d.source].fx); })
                .attr("y1", function(d) { return scaleY(v.data.nodes[d.source].fy); })
                .attr("x2", function(d) { return scaleX(v.data.nodes[d.target].fx); })
                .attr("y2", function(d) { return scaleY(v.data.nodes[d.target].fy); })
                .attr("si", function(d) { return d.source; })
                .attr("ti", function(d) { return d.target; })
                .attr("stroke", v.getLinkCareerColor)
                .attr("display", v.getLinkVisiblity)
            ;
            linkCareerElems.transition()
                .duration(0)
                .attr("stroke", v.getLinkCareerColor)
                .attr("display", v.getLinkVisiblity)
            ;
            linkCareerElems.exit()
                .remove()
            ;


            var nodeDotElems = g.nodeDotGroup.selectAll("circle.dot")
                .data(v.data.nodes)
            ;
            nodeDotElems.enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", function(d) { return scaleX(d.fx); })
                .attr("cy", function(d) { return scaleY(d.fy); })
                .attr("fill", v.getNodeFillColor)
                .attr("i", function(d) { return d.index; })
                .attr("r", 6)
                .attr("display", v.getNodeVisibility)
                .on("mouseover", v.nodeMouseOver)
                .on("mouseout", v.nodeMouseOut)
            ;
            nodeDotElems.transition()
                .duration(0)
                .attr("fill", v.getNodeFillColor)
                .attr("display", v.getNodeVisibility)
            ;
            nodeDotElems.exit()
                .remove()
            ;

            var nodeSectorElemsLeft = g.nodeSectorGroup.selectAll("path.left")
                .data(v.data.nodes)
            ;
            nodeSectorElemsLeft.enter()
                .append("path")
                .attr("class", "left")
                .attr("d", function(d) {return v.sectorPathGenerator(scaleX(d.fx), scaleY(d.fy), 3, "left")})
                .attr("fill", function(d) { return v.getNodeSectorColor(d, "left");})
                .attr("i", function(d) {return d.index;})
                .attr("display", v.getNodeVisibility)
                .on("mouseover", v.nodeMouseOver)
                .on("mouseout", v.nodeMouseOut)
            ;
            nodeSectorElemsLeft.transition()
                .duration(0)
                .attr("fill", function(d) { return v.getNodeSectorColor(d, "left");})
                .attr("display", v.getNodeVisibility)
            ;
            nodeSectorElemsLeft.exit()
                .remove()
            ;

            var nodeSectorElemsRight = g.nodeSectorGroup.selectAll("path.right")
                .data(v.data.nodes)
            ;
            nodeSectorElemsRight.enter()
                .append("path")
                .attr("class", "right")
                .attr("d", function(d) { return v.sectorPathGenerator(scaleX(d.fx), scaleY(d.fy), 3, "right"); })
                .attr("fill", function(d) { return v.getNodeSectorColor(d, "right"); })
                .attr("i", function(d) { return d.index; })
                .attr("display", v.getNodeVisibility)
                .on("mouseover", v.nodeMouseOver)
                .on("mouseout", v.nodeMouseOut)
            ;
            nodeSectorElemsRight.transition()
                .duration(0)
                .attr("fill", function(d) { return v.getNodeSectorColor(d, "right");})
                .attr("display", v.getNodeVisibility)
            ;
            nodeSectorElemsRight.exit()
                .remove()
            ;


            var nodeHaloElems = g.nodeHaloGroup.selectAll("circle.halo")
                .data(v.data.nodes)
            ;
            nodeHaloElems.enter()
                .append("circle")
                .attr("class", "halo")
                .attr("cx", function(d) { return scaleX(d.fx); })
                .attr("cy", function(d) { return scaleY(d.fy); })
                .attr("stroke", v.getNodeHaloColor)
                .attr("i", function(d) { return d.index; })
                .attr("r", 6)
                .attr("display", v.getNodeVisibility)
                .on("mouseover", v.nodeMouseOver)
                .on("mouseout", v.nodeMouseOut)
            ;
            nodeHaloElems.transition()
                .duration(0)
                .attr("stroke", v.getNodeHaloColor)
                .attr("display", v.getNodeVisibility)
            ;
            nodeHaloElems.exit()
                .remove()
            ;


            var nodeCareerElems = g.nodeCareerGroup.selectAll("circle.career")
                .data(v.data.nodes)
            ;
            nodeCareerElems.enter()
                .append("circle")
                .attr("class", "career")
                .attr("cx", function(d) { return scaleX(d.fx); })
                .attr("cy", function(d) { return scaleY(d.fy); })
                .attr("stroke", v.getNodeCareerColor)
                .attr("i", function(d) { return d.index; })
                .attr("r", 8)
                .attr("display", v.getNodeVisibility)
                .on("mouseover", v.nodeMouseOver)
                .on("mouseout", v.nodeMouseOut)
            ;
            nodeCareerElems.transition()
                .duration(0)
                .attr("stroke", v.getNodeCareerColor)
                .attr("display", v.getNodeVisibility)
            ;
            nodeCareerElems.exit()
                .remove()
            ;


            var nodeLabels = g.nodeLabelGroup.selectAll("text")
                .data(v.data.nodes)
            ;
            nodeLabels.enter()
                .append("text")
                .text(function(d) { return d["preflabel_en"]; })
                .attr("x", function(d) { return scaleX(d.fx); })
                .attr("y", function(d) { return scaleY(d.fy); })
                .attr("i", function(d) { return d.index; })
                .attr("display", v.getNodeLabelVisibility)
            ;
            nodeLabels.transition()
                .duration(0)
                .attr("display", v.getNodeLabelVisibility)
            ;
            nodeLabels.exit()
                .remove()
            ;

            var nodeCareerLabels = g.nodeCareerLabelGroup.selectAll("text")
                .data(v.data.nodes)
            ;
            nodeCareerLabels.enter()
                .append("text")
                .text(function(d) { return d["preflabel_en"]; })
                .attr("x", function(d) { return scaleX(d.fx); })
                .attr("y", function(d) { return scaleY(d.fy) - 12; })
                .attr("i", function(d) { return d.index; })
                .attr("display", v.getNodeCareerLabelVisibility)
            ;
            nodeCareerLabels.transition()
                .duration(0)
                .attr("display", v.getNodeCareerLabelVisibility)
            ;
            nodeCareerLabels.exit()
                .remove()
            ;

            console.log("Draw complete");
        },

        getNodeFillColor: function(d) {
            var res = "transparent";
            var v = app.vis;
            var attrName;
            switch (v.params.imagetype) {
                case "megatrend":
                    if (d["megatrend"]) {
                        res = "#ff0000";
                    } else {
                        res = "#fefefe"
                    }
                    break;
                case "demand":
                    attrName = v.params.country + "_jv";
                    if (d[attrName]) {
                        res = "#ff0000";
                    } else {
                        res = "#fefefe";
                    }
                    break;
                case "supply":
                    attrName = v.params.country + "_cvdes";
                    if (d[attrName]) {
                        res = "#ff0000";
                    } else {
                        res = "#fefefe";
                    }
                    break;
            }
            return res;
        },

        getNodeSectorColor: function(d, half) {
            var res = "#fefefe";
            var v = app.vis;

            switch (v.params.imagetype) {
                case "composite":
                case "demandsupply":
                    var attrName = v.params.country + '_' + (half === "left" ? "jv" : "cvdes");
                    var val = d[attrName];
                    if (val) {
                        res = (half === "left") ? v.g.colorScaleLeft(val) : v.g.colorScaleRight(val);
                    }
                    break;
            }
            return res;
        },

        getNodeHaloColor: function(d) {
            var res = "transparent";
            var v = app.vis;

            switch (v.params.imagetype) {
                case "composite":
                    if (d.megatrend) {
                        var attrNameDemand = v.params.country + '_jv';
                        var attrNameSupply = v.params.country + '_cvdes';

                        if (d[attrNameDemand] || d[attrNameSupply]) {
                            res = "#ffff00";
                        } else {
                            res = "#ffff99";
                        }
                    }
                    break;
            }
            return res;
        },

        getNodeCareerColor: function(d) {
            var res = "transparent";
            var cp = app.vis.careerPath;

            if (cp.current.nodes.length > 0) {
                if (cp.current.nodes.indexOf(d.index) !== -1) {
                    res = "#0000ff";
                }
            }
            return res;
        },

        getLinkCareerColor: function(d) {
            var res = "transparent";
            var cp = app.vis.careerPath;

            if (cp.current.path.length > 0) {
                for (var i = 0; i < cp.current.path.length; i++) {
                    var p = cp.current.path[i];

                    if ( (d.source === p.source && d.target === p.target) || (d.source === p.target && d.target === p.source) ) {
                        res = "#0000ff";
                        break;
                    }
                }
            }

            return res;
        },

        getNodeCareerLabelVisibility: function(d) {
            var filterAttr = "isco_oc_key_l1";

            var cp = app.vis.careerPath;

            if (app.vis.params.category !== "all") {
                if (d[filterAttr] !== app.vis.params.category) {
                    return "none";
                }
            }
            if (cp.current.nodes.length > 0) {
                if (cp.current.nodes.indexOf(d.index) !== -1) {
                    return "inline";
                }
            }
            return "none";
        },

        getNodeVisibility: function(d) {
            var filterAttr = "isco_oc_key_l1";

            if (app.vis.params.category !== "all") {
                if (d[filterAttr] !== app.vis.params.category) {
                    return "none";
                }
            }
            return "inline";
        },

        getNodeLabelVisibility: function(d) {
            var filterAttr = "isco_oc_key_l1";

            if (!app.vis.params.labels) {
                return "none";
            }
            if (app.vis.params.category !== "all") {
                if (d[filterAttr] !== app.vis.params.category) {
                    return "none";
                }
            }
            return "inline";
        },

        getLinkVisiblity: function(d) {
            var v = app.vis;

            var filterAttr = "isco_oc_key_l1";
            if (v.params.category !== "all") {
                if (v.data.nodes[d.source][filterAttr] !== v.params.category || v.data.nodes[d.target][filterAttr] !== v.params.category) {
                    return "none";
                }
            }
            return "inline";
        },

        sectorPathGenerator: function(x, y, r, half) {
            if (half === "left") {
                // <path d="M123,123 v10 a5,5 0 0,1 0,-20" fill="blue"/>
                return "M" + x + "," + y + " v" + (2*r) + " a" + r +"," + r + " 0 0,1 0,-" + (4*r);
            }
            if (half === "right") {
                // <path d="M123,123 v-10 a5,5 0 0,1 0,20" fill="red"/>
                return "M" + x + "," + y + " v-" + (2*r) + " a" + r + "," + r + " 0 0,1 0," + (4*r);
            }
        },

        nodeMouseOver: function(d) {
            var v = app.vis;

            if (v.config.mouseMode !== "query") {
                return;
            }
            if (v.g.tip) {
                v.g.tip.show(d);
            }

            // Blur non-adjacent nodes:
            v.g.nodeDotGroup.selectAll("circle")
                .classed("blur", true)
            ;
            v.g.nodeHaloGroup.selectAll("circle")
                .classed("blur", true)
            ;
            v.g.nodeCareerGroup.selectAll("circle")
                .classed("blur", true)
            ;
            v.g.nodeSectorGroup.selectAll("path")
                .classed("blur", true)
            ;

            // Blur non-adjacent labels:
            v.g.nodeLabelGroup.selectAll("text")
                .classed("blur", true)
            ;
            v.g.nodeCareerLabelGroup.selectAll("text")
                .classed("blur", true)
            ;

            // Blur non-adjacent links:
            v.g.linkGroup.selectAll("line")
                .classed("blur", true)
            ;
            v.g.linkCareerGroup.selectAll("line")
                .classed("blur", true)
            ;

            // Highlight my own node:
            v.g.nodeDotGroup.selectAll("circle[i='" + d.index  + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.nodeHaloGroup.selectAll("circle[i='" + d.index  + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.nodeCareerGroup.selectAll("circle[i='" + d.index  + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.nodeSectorGroup.selectAll("path[i='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;

            // Highlight in my own label:
            v.g.nodeLabelGroup.selectAll("text[i='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.nodeCareerLabelGroup.selectAll("text[i='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;

            // Highlight in adjacent nodes:
            for (var j in v.data.adj[d.index]) {
                var adjIndex = v.data.adj[d.index][j];

                v.g.nodeDotGroup.selectAll("circle[i='" + adjIndex  + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;
                v.g.nodeHaloGroup.selectAll("circle[i='" + adjIndex  + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;
                v.g.nodeCareerGroup.selectAll("circle[i='" + adjIndex  + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;
                v.g.nodeSectorGroup.selectAll("path[i='" + adjIndex + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;

                v.g.nodeLabelGroup.selectAll("text[i='" + adjIndex + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;
                v.g.nodeCareerLabelGroup.selectAll("text[i='" + adjIndex + "']")
                    .classed("blur", false)
                    .classed("focus", true)
                ;
            }

            // Highlight in adjacent links:
            v.g.linkGroup.selectAll("line[si='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.linkGroup.selectAll("line[ti='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;

            v.g.linkCareerGroup.selectAll("line[si='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
            v.g.linkCareerGroup.selectAll("line[ti='" + d.index + "']")
                .classed("blur", false)
                .classed("focus", true)
            ;
        },

        nodeMouseOut: function(d) {
            var v = app.vis;

            if (v.config.mouseMode !== "query") {
                return;
            }
            if (v.g.tip) {
                v.g.tip.hide(d);
            }

            // Restore nodes:
            v.g.nodeDotGroup.selectAll("circle")
                .classed("blur", false)
                .classed("focus", false)
            ;
            v.g.nodeHaloGroup.selectAll("circle")
                .classed("blur", false)
                .classed("focus", false)
            ;
            v.g.nodeCareerGroup.selectAll("circle")
                .classed("blur", false)
                .classed("focus", false)
            ;
            v.g.nodeSectorGroup.selectAll("path")
                .classed("blur", false)
                .classed("focus", false)
            ;

            // Restore labels:
            v.g.nodeLabelGroup.selectAll('text')
                .classed("blur", false)
                .classed("focus", false)
            ;
            v.g.nodeCareerLabelGroup.selectAll('text')
                .classed("blur", false)
                .classed("focus", false)
            ;

            // Restore links:
            v.g.linkGroup.selectAll("line")
                .classed("blur", false)
                .classed("focus", false)
            ;
            v.g.linkCareerGroup.selectAll("line")
                .classed("blur", false)
                .classed("focus", false)
            ;
        },

        setMouseMode: function(mode) {
            var g = app.vis.g;
            var c = app.vis.config;

            if (!mode) {
                mode = c.mouseMode;
            }

            switch (mode) {
                case "move":
                    v.nodeMouseOut();

                    g.rootGroup
                        .style("cursor", "move")
                        .style("cursor", "grab")
                        .style("cursor", "-moz-grab")
                        .style("cursor", "-webkit-grab")
                        .attr("pointer-events", "none")
                    ;
                    g.zoomGroup
                        .style("cursor", "move")
                        .style("cursor", "grab")
                        .style("cursor", "-moz-grab")
                        .style("cursor", "-webkit-grab")
                    ;
                    break;

                case "query":
                    g.rootGroup
                        .style("cursor", "pointer")
                        .attr("pointer-events", "all")
                    ;
                    g.zoomGroup.style("cursor", "default");
                    break;
            }

            $(".action-mousemode").addClass("hidden");
            $(".action-mousemode[data-mode='" + mode + "']").removeClass("hidden");

            c.mouseMode = mode;
        },

        onZoom: function() {
            var g = app.vis.g;
            var c = app.vis.config;

            if (g.rootGroup && c.mouseMode === "move") {
                c.zoom.current = d3.event.transform;
                g.rootGroup.attr("transform", d3.event.transform);
            }
        },

        onZoomStart: function() {
            var g = app.vis.g;
            var c = app.vis.config;

            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "mousedown" && c.mouseMode === "move") {
                if (g.rootGroup) {
                    g.rootGroup
                        .style("cursor", "move")
                        .style("cursor", "grabbing")
                        .style("cursor", "-moz-grabbing")
                        .style("cursor", "-webkit-grabbing")
                    ;
                }
                if (g.zoomGroup) {
                    g.zoomGroup
                        .style("cursor", "move")
                        .style("cursor", "grabbing")
                        .style("cursor", "-moz-grabbing")
                        .style("cursor", "-webkit-grabbing")
                    ;
                }
            }
        },

        onZoomEnd: function() {
            var g = app.vis.g;
            var c = app.vis.config;
            if (c.mouseMode === "move") {
                if (g.rootGroup) {
                    g.rootGroup
                        .style("cursor", "move")
                        .style("cursor", "grab")
                        .style("cursor", "-moz-grab")
                        .style("cursor", "-webkit-grab")
                        .attr("pointer-events", "none")
                    ;
                }
                if (g.zoomGroup) {
                    g.zoomGroup
                        .style("cursor", "move")
                        .style("cursor", "grab")
                        .style("cursor", "-moz-grab")
                        .style("cursor", "-webkit-grab")
                    ;
                }
            }
        },

        toggleMouseMode: function() {
            var v = app.vis;

            if (d3.event) {
                d3.event.preventDefault();
            }
            var newMouseMode = v.config.mouseMode === "move" ? "query" : "move";
            v.setMouseMode(newMouseMode);
        }

    });

    app.vis.init();

})(window, document, window.jQuery);
