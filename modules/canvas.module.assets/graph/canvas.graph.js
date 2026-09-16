/*  =========================================================
    KNOP.FAMILY
    Smart Home Control Center - Canvas Graph Scripts
   
    (C) 2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

const GRAPH_LABEL_OFFSET = 20;

var Graphs = {};

// CONTROL REGISTRATION AFTER LOAD
this.addEventListener("load", function () {

    ControlProviders.graph = new Graph();

});

// GRAPH INFO OBJECT
function GraphInfo(targetControl, data) {

/*  =========================================================
        METHODS
    =========================================================  */

    GraphInfo.prototype.getMinMaxValue = function (maxMode = true, keyField = false) {

        /* getMinMaxValue()_________________________________________________________
        Gets min or max value of array of values for the main axis                 */

        var returnValue = [];
        var properties = Object.keys(this.data[0]);

        properties.forEach(property => {

            if (this.layout[property] != undefined) {

                if ((keyField && this.layout[property].type == 'key') || (!keyField && (this.layout[property].type == undefined || this.layout[property].type != 'key'))) {

                    var axis = (this.layout != null && this.layout[property].axis != undefined ? this.layout[property].axis : -1); 
                
                    if (maxMode) {

                        var newExtreme = Math.max(...this.data.map(item => item[property]).filter(item => item != null));
                        if (returnValue[axis] == undefined || returnValue[axis] < newExtreme) returnValue[axis] = newExtreme;

                    } else {

                        var newExtreme = Math.min(...this.data.map(item => item[property]).filter(item => item != null));
                        if (returnValue[axis] == undefined || returnValue[axis] > newExtreme) returnValue[axis] = newExtreme;
                    }
                }
            }
        });

        if (keyField) return returnValue[-1];
        else return returnValue;
    }
        
    GraphInfo.prototype.getYAxisMinValue = function () {

        var returnValue = [];

        for (var index = 0; index < this.yMinValue.length; index++) 
            returnValue.push((this.yMinValue[index] - ((1 - this.valueRange[index]) * (this.yMaxValue[index] - this.yMinValue[index]))).toFixed(2));

        return returnValue;
    }

    GraphInfo.prototype.getYAxisMaxValue = function () {

        var returnValue = [];

        for (var index = 0; index < this.yMaxValue.length; index++) 
            returnValue.push((this.yMaxValue[index] + ((1 - this.valueRange[index]) * (this.yMaxValue[index] - this.yMinValue[index]))).toFixed(2));

        return returnValue;
    }

    GraphInfo.prototype.getPrimaryFields = function () {

        /* getPrimaryFields()______________________________________________________________
        Gets primary field per axis that defines value range and formatting               */

        var returnValue = [];

        Object.keys(this.data[0]).forEach(property => { 
            
            if (this.layout[property] != undefined && this.layout[property].primary != undefined && this.layout[property].primary == true) { 
                
                var axis = this.layout[property].axis != undefined ? this.layout[property].axis : -1;
                returnValue[axis] = property; 
            
            }
        
        });
        
        return returnValue;

    }

    GraphInfo.prototype.getValueRanges = function () {

        var returnValue = [];
        this.primaryField.forEach(primaryField => returnValue.push(this.getLayoutValue(primaryField, 'valueRange', 0.8)));
        
        return returnValue;

    }
    
    /*  =========================================================
            LAYOUT
        =========================================================  */
        
    GraphInfo.prototype.getLayout = function (targetControl) {

        /* getLayout()______________________________________________________________
        Gets layout definition from graph control                                  */

        var view = targetControl.getAttribute('cc-view');

        var layoutSource = JSON.parse(targetControl.getAttribute('cc-layout'));
        var layoutMaps = JSON.parse(targetControl.getAttribute('cc-layout-maps'));
        var layoutMap = layoutMaps[JSON.parse(targetControl.getAttribute('cc-views'))[view].layoutMap]; 

        if (layoutMap == undefined || layoutMap == null) return layoutSource;
        else {

            var returnValue = {};
            layoutMap.forEach(fieldDef => {
                
                returnValue[fieldDef.field] = layoutSource[fieldDef.layout];
                
                if (fieldDef.axis != undefined) returnValue[fieldDef.field].axis = fieldDef.axis;
                if (fieldDef.primary != undefined) returnValue[fieldDef.field].primary = fieldDef.primary;
            });

            return returnValue;
        }
    }


    GraphInfo.prototype.getLayoutValue = function (property, entity = 'type', defaultValue = '') {

        /* getLayoutValue()_________________________________________________________
        Gets specified or default value for graph layout                           */

        switch (entity) {

            case 'fill':
            case 'stroke':
                return (this.layout != null && this.layout[property][entity] != undefined ? entity + ': ' + this.layout[property][entity] : '');
            case 'line':
                if (this.layout != null && this.layout[property][entity] != undefined) {
                    
                    var strength = this.getLayoutValue(this.layout, property, 'strength');
                    
                    switch (this.layout[property].line) {
                        case 'dashed': return 'stroke-dasharray: ' + (strength * 2).toString() + ';';
                        case 'dotted': return 'stroke-dasharray: ' + strength.toString() + ';';
                    }
                } else return '';
            default:
                return (this.layout != null && this.layout[property] != undefined  && this.layout[property][entity] != undefined ? this.layout[property][entity] : defaultValue);  
                
        }
    }

    GraphInfo.prototype.getKeyLayout = function () {

        /* getKeyLayout()_______________________________________________________________
        Gets layout data for current key field                                         */

        var key = this.getDataKeyField();
        return {
            key:            key,
            valueFormat:    this.getLayoutValue(key, 'valueFormat', null),
            valueNormalize: this.getLayoutValue(key, 'valueNormalize', null),
            valueStep:      this.getLayoutValue(key, 'valueStep', 1)
        }
    }

    GraphInfo.prototype.getDataKeyField = function () {

        /* getDataKeyField()____________________________________________________________
        Identifies key field in given data set based on layout                         */

        var returnValue = null;

        Object.keys(this.data[0]).forEach(property => { if (this.layout[property] != undefined && this.layout[property].type == 'key') { returnValue = property; }});
        return returnValue;

    }

    /*  =========================================================
         PROPERTIES
        =========================================================  */

    GraphInfo.prototype.data            = {};
    GraphInfo.prototype.layout          = {};
    GraphInfo.prototype.options         = {};

    GraphInfo.prototype.primaryField    = [];
    GraphInfo.prototype.valueRange      = [];
    
    GraphInfo.prototype.relativeOffset  = 0;
    GraphInfo.prototype.axisOffset      = 0;
    
    GraphInfo.prototype.yMaxValue       = [];
    GraphInfo.prototype.yMinValue       = [];

    GraphInfo.prototype.yAxisMinValue   = [];
    GraphInfo.prototype.yAxisMaxValue   = [];

    GraphInfo.prototype.xMaxValue       = 0;
    GraphInfo.prototype.xMinValue       = 0;

    GraphInfo.prototype.xAxisMinValue   = 0;
    GraphInfo.prototype.xAxisMaxValue   = 0;

    GraphInfo.prototype.hasSecondaryAxis = false;

    this.layout          = this.getLayout(targetControl); 
    this.data            = data;
    
    this.options         = JSON.parse(targetControl.getAttribute('cc-options'));

    this.primaryField    = this.getPrimaryFields();
    this.valueRange      = this.getValueRanges();
    
    this.relativeOffset  = parseFloat(targetControl.getAttribute('cc-offset'));
    this.axisOffset      = ((targetControl.clientHeight + targetControl.clientWidth) / 2) * this.relativeOffset;
    
    // Y-AXIS - MIN AND MAX VALUES
    this.yMaxValue       = this.getMinMaxValue();
    this.yMinValue       = this.getMinMaxValue(false);

    this.yAxisMinValue   = this.getYAxisMinValue();
    this.yAxisMaxValue   = this.getYAxisMaxValue();

    // X-AXIS - MIN AND MAX VALUES
    this.xMaxValue       = this.getMinMaxValue(true, true);
    this.xMinValue       = this.getMinMaxValue(false, true);

    this.xAxisMinValue   = Math.floor(this.xMinValue);
    this.xAxisMaxValue   = Math.ceil(this.xMaxValue);

    this.hasSecondaryAxis = (this.options != undefined && this.options.showSecondaryYAxis != undefined && this.options.showSecondaryYAxis == true); 

}

// GRAPH
function Graph() {

    Graph.prototype.parseControl = function (control, updateTimestamp = null) {

        /* parseControl()___________________________________________________________
        Refreshes graph                                                            */

        var data = Dataset[control.binding];

        if (data != undefined && data != null && data.length > 0) {

            var currentControl = document.getElementById(control.id);

            //var graphInfo = this.getGraphInfo(data, layout);
            var graphInfo = new GraphInfo(currentControl, data);

            // DRAW AXES
            this.drawChart(currentControl, graphInfo);
            
            // DRAW GRAPH
            this.drawGraph(currentControl, graphInfo);
            
            // DRAW TITLE
            this.drawTitle(currentControl, graphInfo.axisOffset);
        }
    }

    /*  =========================================================
         GRAPH DRAWING
        =========================================================  */

    Graph.prototype.drawGraph = function (targetControl, graphInfo) {

        /* drawGraph()______________________________________________________________
        Draws graph based on given data                                            */

        // DOM REFERENCES
        var drawArea = targetControl.querySelector('#graph');
        var dataDots = targetControl.querySelector('#data-dots');
        var dataZone = targetControl.querySelector('#data-zone');
        
        var graphContent = this.drawGraphContent(targetControl, graphInfo);
        this.drawHorizontalAxisLabels(targetControl, graphInfo);
        
        // DRAW VALUE DOTS
        dataDots.innerHTML = graphContent.dots;
        dataZone.innerHTML = graphContent.zones;

        // DRAW GRAPH
        drawArea.innerHTML = '';

        var graphValues = Object.keys(graphContent.points);
        graphValues.forEach(property => {

            var graphColor = graphInfo.getLayoutValue(property, 'stroke');      
            var graphStrength = graphInfo.getLayoutValue(property, 'strength');         
            var graphLineStyle = graphInfo.getLayoutValue(property, 'line');

            drawArea.innerHTML += '<polyline id="graph-' + property + '" style="stroke-width: ' + graphStrength.toString() + '; ' + graphColor + '; ' + graphLineStyle +'" class="graph-line" points="' + graphContent.points[property] + '"/>';
        });
    }

    Graph.prototype.drawGraphContent = function (targetControl, graphInfo) {

        /* drawGraphContent()_______________________________________________________
        Draws graph based on given data                                            */

        var returnValue = { points: [], dots: '', zones: '' };
        var key = graphInfo.getDataKeyField();

        var xStep = (targetControl.clientWidth - graphInfo.axisOffset - (graphInfo.hasSecondaryAxis ? graphInfo.axisOffset : 0)) / (graphInfo.xAxisMaxValue - graphInfo.xAxisMinValue);
               
        var valueSkip = this.getValueSkip(graphInfo, key);
        var zones = {  zoneStarts: [], zoneWidths: [] };
        
        for (var index = 0; index < graphInfo.data.length; index++) {
            
            if (valueSkip == -1 || index == 0 || index % valueSkip == 0 || index == (graphInfo.data.length - 1)) {

                Object.keys(graphInfo.data[index]).forEach(property => {

                    var style       = graphInfo.getLayoutValue(property);

                    var axis        = graphInfo.getLayoutValue(property, 'axis', -1);
                    var yStep       = (targetControl.clientHeight - graphInfo.axisOffset) / (graphInfo.yAxisMaxValue[axis] - graphInfo.yAxisMinValue[axis]);

                    var xValue      = ((graphInfo.data[index][key] - graphInfo.xAxisMinValue) * xStep) + graphInfo.axisOffset;

                    switch (style) {    

                        case 'line':
                            
                            var yValue = ((graphInfo.yAxisMaxValue[axis] - parseFloat(graphInfo.data[index][property])) * yStep) + (graphInfo.axisOffset / 2);
                            var point = xValue.toFixed(5) + ' ' + yValue.toFixed(2) + ' ';

                            if (graphInfo.data[index][property] != null)
                                returnValue.points[property] = (returnValue.points[property] == undefined ? point : returnValue.points[property] + point);
                            
                            // VALUE DOTS ON LINE GRAPH (OPTIONAL)
                            if (graphInfo.getLayoutValue(property, 'dots'))
                                returnValue.dots +='<circle id="point" class="graph-value-dot" style="' + graphColor + '" cx="' + xValue.toFixed(5) + '" cy="' + yValue + '" r="' + graphInfo.getLayoutValue(property, 'dotsize', 1) + '"/>';

                            break;

                        case 'indicator':
                        case 'zone':
        
                            this.getZoneOrIndicator(returnValue, targetControl, graphInfo, index, property, xValue, style, zones)
                            break;

                    }
                });
            }

        }
        
        return returnValue;

    }

    Graph.prototype.getZoneOrIndicator = function (returnValue, targetControl, graphInfo, index, property, xValue, style, zones) {

        /* getZoneOrIndicator()_____________________________________________________
        Gets graph value indicator for bool (true/false) value                     */

        var isZone = (style == 'zone' ||graphInfo.getLayoutValue(property, 'indicatorType', '') == 'zone');
        var isConnected = (isZone || graphInfo.getLayoutValue(property, 'indicatorType', '') == 'connected');
    
        var inColor = graphInfo.getLayoutValue(property, 'fill');
        var inSize =  graphInfo.getLayoutValue(property, 'size', 1);
        
        if (isConnected) {

            if (graphInfo.data[index][property] == false || index == (graphInfo.data.length - 1)) {
                
                if (zones.zoneStarts[property] != undefined) returnValue[(isZone ? 'zones' : 'dots')] += this.getArea(targetControl, zones.zoneStarts[property], zones.zoneWidths[property], isZone, inSize, inColor, graphInfo.axisOffset);
                zones.zoneStarts[property] = undefined; 
                zones.zoneWidths[property] = 0;
            
            } else {

                if (zones.zoneStarts[property] == undefined) zones.zoneStarts[property] = xValue.toFixed(5) ;
                if (zones.zoneWidths[property] == undefined) zones.zoneWidths[property] = 0;
                
                zones.zoneWidths[property] += parseFloat(((targetControl.clientWidth - (2 * graphInfo.axisOffset)) / graphInfo.data.length).toFixed(5));
            }

        } else returnValue.dots += this.getIndicator(graphInfo, xValue, axis, inSize, inColor);
         
    }

    Graph.prototype.getIndicator = function (graphInfo, xValue, axis, inSize, color) {

        /* getIndicator()___________________________________________________________
        Gets graph value indicator for bool (true/false) value                     */

        var yValue = graphInfo.yAxisMinValue[axis] + (graphInfo.axisOffset / 2);         
        return (graphInfo.data[index][property] ? '<circle id="point" class="graph-value-dot" style="' + color + '" cx="' + xValue.toFixed(5) + '" cy="' + yValue + '" r="' + inSize + 'vmin"/>' : '');
         
    }

    Graph.prototype.getArea = function (targetControl, zoneStart, zoneWidth, isZone, inSize, color, axisOffset) {

        /* getArea()________________________________________________________________
        Gets graph zone or indicator area                                          */
                                        
        var rectHeight = isZone ? (targetControl.clientHeight - (1.5 * axisOffset)) : inSize;
        var rectTop    = isZone ? (axisOffset / 2) : (25 + (axisOffset / 2));

        return '<rect id="point" class="graph-value-dot" style="' + color + '" x="' + zoneStart + '" y="' + rectTop + '" width="' + zoneWidth + (!isZone ? 'vmin' : '') + '" height="' + rectHeight + (!isZone ? 'vmin' : '') + '"/>';                                        

    }

    Graph.prototype.getValueSkip = function(graphInfo, key) {

        var returnValue = graphInfo.getLayoutValue(key, 'valueSkip', -1);
        return (returnValue < 1 && returnValue > 0 ? (graphInfo.data.length * returnValue) : returnValue);

    }

    /*  =========================================================
         AXES, BACKGROUND & LABELS
        =========================================================  */

    Graph.prototype.drawChart = function (targetControl, graphInfo) {

        /* drawChart()______________________________________________________________
        Draws axes and background of chart                                         */
        
        var actualHeight = (targetControl.clientHeight - graphInfo.axisOffset);
        var actualWidth = (targetControl.clientWidth - graphInfo.axisOffset - (graphInfo.hasSecondaryAxis ? graphInfo.axisOffset : 0));

        // DRAW BACKGROUND
        this.drawBackground(targetControl, actualWidth, actualHeight, graphInfo.axisOffset);

        // DRAW AXES
        this.drawAxes(targetControl, actualWidth, actualHeight, graphInfo.axisOffset);

        // DRAW Y-AXIS LABELS
        this.clearLabels(targetControl);
        this.drawVerticalAxisLabels(targetControl, graphInfo, actualWidth, actualHeight);
        
        // DRAW SECONDARY Y-AXIS LABELS (optional)
        if (graphInfo.hasSecondaryAxis) this.drawVerticalAxisLabels(targetControl, graphInfo, actualWidth, actualHeight, 1);

    }
    
    Graph.prototype.drawAxes = function (targetControl, width, height, offset) {

        /* drawAxes()_________________________________________________________________
        Draws vertical and horizontal axes of current chart                          */

        var axis = targetControl.querySelector('#axis');
        axis.innerHTML = '<polyline id="axis" class="graph-axis" points="' + offset + ' ' + (offset / 2) + ' ' + offset + ' ' + height + ' ' + (width + offset) + ' ' + height + '"/>';

    }

    Graph.prototype.drawVerticalAxisLabels = function (targetControl, graphInfo, width, height, axis = 0) {

        /* drawVerticalAxisLabels()___________________________________________________
        Draws labels on vertical chart axis                                          */

        var returnValue = ''; var stepCount = 0;

        var labels = targetControl.querySelector('#axis-labels');
        
        var yStep = height / (graphInfo.yAxisMaxValue[axis] - graphInfo.yAxisMinValue[axis]);
        var valuePrefix = graphInfo.getLayoutValue(graphInfo.primaryField[axis], 'valuePrefix');
        var valueSuffix = graphInfo.getLayoutValue(graphInfo.primaryField[axis], 'valueSuffix');
        var valueSkip = graphInfo.getLayoutValue(graphInfo.primaryField[axis], 'valueSkip', -1);
        var valueDecimals = graphInfo.getLayoutValue(graphInfo.primaryField[axis], 'decimals', 0);

        for (var axisStep = parseFloat(graphInfo.yAxisMaxValue[axis]); axisStep >= parseFloat(graphInfo.yAxisMinValue[axis]); axisStep--) {
            
            if (valueDecimals == 0) stepMod = 1 - (axisStep.toFixed(0) - axisStep);
            else stepMod = 1;

            var yValue = ((stepCount * yStep * stepMod) + (graphInfo.axisOffset / 2));

            if (yValue < targetControl.clientHeight - graphInfo.axisOffset) 
            if (valueSkip == -1 || stepCount == 0 || stepCount % valueSkip == 0) {
                
                var textValue = valuePrefix + axisStep.toFixed(valueDecimals).toString() + valueSuffix;
                
                returnValue += '<text text-anchor="start" x="' + (axis == 0 ? 0 : targetControl.clientWidth - graphInfo.axisOffset + GRAPH_LABEL_OFFSET) + '" y="' + yValue + '" class="graph-axis-caption" alignment-baseline="middle">' + textValue + '</text>'
                if (axis == 0) returnValue += '<line class="graph-value-line" x1="' +  graphInfo.axisOffset + '" y1="' + yValue + '" x2="' + (width + graphInfo.axisOffset) + '" y2="' + yValue + '"/>';
            }
            
            stepCount++; 

        }
        
        labels.innerHTML += returnValue;

    }

    Graph.prototype.drawHorizontalAxisLabels = function (targetControl, graphInfo) {

        /* drawHorizontalAxisLabels()_________________________________________________
        Draws labels on horizontal chart axis                                          */

        var returnValue = '';
        var keyLayout = graphInfo.getKeyLayout();
        
        // DISTANCE IN PIXEL BETWEEN EVERY X-AXIS LABEL
        if (keyLayout.valueStep <= 1) var xStep = (targetControl.clientWidth - graphInfo.axisOffset - (graphInfo.hasSecondaryAxis ? graphInfo.axisOffset : 0)) * keyLayout.valueStep;
        else var xStep = (targetControl.clientWidth - graphInfo.axisOffset - (graphInfo.hasSecondaryAxis ? graphInfo.axisOffset : 0)) * (keyLayout.valueStep / (graphInfo.xAxisMaxValue - graphInfo.xAxisMinValue));
        
        var stepIndex = 0; var xMove = 0;
        var stepSize = (keyLayout.valueStep <= 1 ? (keyLayout.valueStep * (graphInfo.xAxisMaxValue - graphInfo.xAxisMinValue)) : keyLayout.valueStep);

        for (var axisStep = graphInfo.xAxisMinValue; axisStep <= graphInfo.xAxisMaxValue; axisStep += stepSize) {

            var currentStep = axisStep; 
            var value = axisStep;
            
            if (keyLayout.valueFormat != null) {

                if (keyLayout.valueNormalize != null) {

                    // NORMALIZE VALUE (i.e. TO THE NEXT HALF HOUR)
                    var normalizeValue = this.roundValue(axisStep, keyLayout.valueNormalize);
                    
                    currentStep = normalizeValue.value;
                    xMove = normalizeValue.distance / axisStep; 
                }

                // GET FORMATTED VALUE
                value = this.formatValue(currentStep, keyLayout.valueFormat, graphInfo.getLayoutValue(keyLayout.key, 'valueType', null));
            }

            returnValue += '<text class="graph-axis-caption" y="' + ((targetControl.clientHeight - graphInfo.axisOffset) + (1.5 * GRAPH_LABEL_OFFSET)) + '" x="' + ((stepIndex * xStep) + graphInfo.axisOffset + xMove) + '">' + value + '</text>'
            stepIndex++;           
        }   
        
        targetControl.querySelector('#axis-labels').innerHTML += returnValue;

    }

    Graph.prototype.drawBackground = function (targetControl, width, height, offset) {

        /* drawBackground()__________________________________________________________
        Sets background of current chart                                            */

        var background = targetControl.querySelector('#background-rect');
        
        background.setAttribute('x', offset);
        background.setAttribute('y', (offset / 2));
        background.setAttribute('width', width);
        background.setAttribute('height', height - (offset / 2));

    }

    Graph.prototype.drawTitle = function (targetControl, axisOffset, altTitle = null) {

        /* drawTitle()__________________________________________________________________
        Draws the title of the current graph                                           */

        var title = targetControl.querySelector('#title');
        var titleText = altTitle != null ? altTitle : targetControl.getAttribute('cc-title');
        var extTitle = document.getElementById('graph-title-' + targetControl.id);

        if (extTitle == null) {
            
            title.innerHTML = '<text text-anchor="middle" class="graph-title" y="' + (axisOffset * 1.25) + '" x="' + ((targetControl.clientWidth / 2) + (axisOffset * 0.5)) + '">' + titleText + '</text>';
        
        } else {
        
            document.getElementById('graph-title-' + targetControl.id).innerHTML = titleText;
        
        }

    }

    Graph.prototype.clearLabels = function (targetControl) {

        /* drawVerticalAxisLabels()___________________________________________________
        Draws labels on vertical chart axis                                          */

        var labels = targetControl.querySelector('#axis-labels');
        labels.innerHTML= '';

    }

    /*  =========================================================
        LOADING AND DATA MANIPULATION
        =========================================================  */
    
    Graph.prototype.loadView = function (targetControl, viewId) {

        /* loadView()___________________________________________________________________
        Loads a pre-defined view into given graph                                      */

        var views = JSON.parse(targetControl.getAttribute('cc-views'));

        targetControl.setAttribute('cc-view', viewId); 
        targetControl.setAttribute('cc-binding', views[viewId].binding); 
        targetControl.setAttribute('cc-bindingProvider', views[viewId].bindingProvider); 
        targetControl.setAttribute('cc-title', views[viewId].title); 
        targetControl.setAttribute('cc-layout-map', views[viewId].layoutMap); 
        
        if (views[viewId].offset != undefined) targetControl.setAttribute('cc-offset', views[viewId].offset); 
        if (views[viewId].options != undefined) targetControl.setAttribute('cc-options', JSON.stringify(views[viewId].options)); 
        
        refreshBindings(); refreshStates(true);

    }
    
    /*  =========================================================
         ACTION HANDLING
        =========================================================  */

    Graph.prototype.sendRequest = function (requestMode, payload, refreshControl, controlProvider, nextFunction) {

        /* sendRequest()________________________________________________________________
        Action handling for graph control                                              */

        switch (requestMode.toLowerCase()) {

            default:
            case 'load':
                if (payload.view != undefined && payload.target != undefined) {

                    var graph = document.getElementById(payload.target);
                    this.loadView(graph, payload.view);
                    break;
                }
                break;

        }
    }

    /*  =========================================================
         TOOLS
        =========================================================  */

    Graph.prototype.formatValue = function (value, format, valueType) {

        /* formatValue()________________________________________________________________
        Formats given value into target format                                         */

        switch (format.toLowerCase()) {

            /* Data formatting */
            case 'time':
                if (valueType.toLowerCase() == 'timestamp') return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            case 'shorttime':
                if (valueType.toLowerCase() == 'timestamp') return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            case 'hour':
            case 'hours':
                if (valueType.toLowerCase() == 'timestamp') return new Date(value).toLocaleTimeString([], { hour: '2-digit' });
    
            case 'date':
                if (valueType.toLowerCase() == 'timestamp') return new Date(value).toLocaleDateString();

            case 'shortdate':
                if (valueType.toLowerCase() == 'timestamp') return new Date(value).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
        
            default:
                return value;

        }
    }

    Graph.prototype.roundValue = function (value, targetDimension = 'time-hour-half', param = 'nearest') {

        /* roundValue()__________________________________________________________________
        Rounds value into target dimension (xx:15, xx:30, xx:00)                      */

        var returnValue = {};
        
        if (targetDimension.startsWith('time')) {

            switch (targetDimension) {

                case 'time-hour-quater':  var modifier = 900000; break;
                case 'time-hour-half':    var modifier = 1800000; break;
                case 'time-hour-full':    var modifier = 3600000; break;
                
            }

            var rest = (value % modifier);
            
            if (param == 'down' || (param == 'nearest' && rest > (modifier / 2))) return { 
                value: value - rest, distance: -rest 
            };
            else if (param == 'up' || (param == 'nearest' && rest <= (modifier / 2))) return { 
                value: (value - rest) + modifier, distance: (value - rest) 
            };
            else return  { 
                value: value, distance: 0 
            };
        }

        return { value: value, distance: 0 };

    }

}
