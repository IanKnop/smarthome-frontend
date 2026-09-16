/*  =========================================================
    KNOP.FAMILY
    Smart Home UI
    
    Adapter for KNOP.FAMILY Smart Home Backend 

    (C) 2026 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

// ADAPTER REGISTRATION AFTER LOAD
window.addEventListener("beforeunload", function () {

    // TERMINATE CLIENT ID REFRESHING
    Adapters.smarthome.refreshTrigger.close();

});

this.addEventListener("load", function () {

    Adapters.smarthome    = new smartHomeBackend(location.origin, '', '/api');
    var clientId        = sessionStorage.clientId ?? (Math.floor(Math.random() * 900000000) + 100000000).toString();

    if (sessionStorage.clientId == undefined) sessionStorage.clientId = clientId;
    Adapters.smarthome.clientId = clientId;

});

// ADAPTER BASE FUNCTION
function smartHomeBackend(uri, port, basefolder = '') {

    // WebSocket
    var webSocketUrl        = 'ws://' + location.host + '/ws/';

    // COMMON ADAPTER PROPERTIES 
    this.adapterName        = 'smarthome';
    this.dataset            = null;
    this.bindings           = null;
    this.delayedBindings    = null;
    this.datapoints         = null;

    this.doRefresh          = true;
    this.refreshDatapoints  = [];
    this.refreshOnUpdate    = true;

    // ADDITIONAL HELPER VALUES
    //this.clientId           = null;
    this.lastUpdate         = null;
    this.retrievingData     = false;

    // ADAPTER CONNECTION
    this.uri                = uri;
    this.port               = port;
    this.basefolder         = basefolder;
    this.adapterLocation    = this.uri + (this.port != '' ? ':' : '') + this.port + this.basefolder;

    // WEBSOCKET
    this.refreshTrigger     = null;

    // ACTIONS
    this.actions            = { };

    // ZIGBEE2MQTT NAMING
    var prefixes            = [ 'devices', 'group', 'light', 'climate', 'motion', 'sensor', 'valve', 'valves', 'heating', 'automation', 'window', 'power', 'plug', 'videos' ];
    prefixes.forEach(prefix => this[prefix + 'Prefix'] = prefix + '/');

    // GET VARS
    var GET_VARS = [];
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(a,name,value){GET_VARS[name]=value;});


    /* =========================================================
        METHODS
       ========================================================= */
    smartHomeBackend.prototype.sendRequest = function (requestMode, payload, refreshControl = null, controlProvider = 'canvas', nextFunction = null) {

        /* sendRequest()________________________________________________________
        Sends request to Node-RED                                              */

        var mode = requestMode.toLowerCase();
        var isZigbeeGroup = ((payload.isGroup == undefined && payload.deviceId != undefined && payload.deviceId.toLowerCase().startsWith('group/')) || (payload.isGroup != undefined && payload.isGroup == true));

        if (mode.startsWith('get')) {
            // GET REQUESTS
            var deviceId = (mode == 'get' ? payload.deviceId : (mode == 'getprofile' ? payload.groupId : payload.automationId));
            this.setDatapoint(deviceId, mode, payload, nextFunction, this, refreshControl);

        } else {
            // OTHER REQUESTS
            this.setDatapoint(payload.deviceId, requestMode, payload, function (requestAnswer, thisAdapter, refreshControl) {
                if (nextFunction != null) nextFunction(requestAnswer, thisAdapter, refreshControl);
            }, this);   
        }
    }

    smartHomeBackend.prototype.refreshState = function (bindingInfo, updateTimestamp, force = false) {

        /* refreshState()_______________________________________________________
        Provider bound refresh for Node-RED http interface                     */

        // INITIALIZE BINDINGS AND DATAPOINTS LIST
        if (this.bindings == null || force) this.retrieveBindings();

        // UPDATE CONTROLS AND DATA 
        if (!this.retrievingData && (this.lastUpdate == null || this.lastUpdate != updateTimestamp)) this.updateDataset(updateTimestamp, force);
        else if (bindingInfo.hasControl) refreshControls(bindingInfo, this);

    };

    smartHomeBackend.prototype.retrieveBindings = function () {

        /* retrieveBindings()___________________________________________________
        Retrieve all data for this adapter                                     */

        this.bindings           = getProviderBindings(AdapterBindings, this.adapterName);
        this.delayedBindings    = getProviderBindings(AdapterBindings, this.adapterName, triggerAdapterUpdate, true, true);

        this.datapoints         = this.bindings.join(',');

    }

    smartHomeBackend.prototype.updateDataset = function (updateTimestamp, force = false) {

        /* updateDataset()______________________________________________________
        Retrieve all data for this adapter                                     */
        
        if (force || this.doRefresh || !this.refreshOnUpdate) {

            this.retrievingData = true;
            this.doRefresh      = false;

            var datapoints = [];
            if (this.refreshDatapoints.length == 0) {

                // IF NOT SPECIFIED, UPDATE ALL DATAPOINTS
                datapoints = this.datapoints;

            } else {

                // UPDATE ONLY THE CHANGED DATAPOINTS
                datapoints = this.refreshDatapoints;
                this.refreshDatapoints = [];
            } 

            this.getDatapoints(datapoints, function (requestAnswer) {

                Adapters.smarthome.dataset    = requestAnswer;
                Adapters.smarthome.lastUpdate = updateTimestamp;

                updateDataset(toAdapterDataSet(Adapters.smarthome.dataset), '', Adapters.smarthome.adapterName);
                refreshAdapterControls(Adapters.smarthome);
                
                Adapters.smarthome.retrievingData = false;

            }, this);
        }

    }

    smartHomeBackend.prototype.checkActiveState = function (checkValue, type, trueValue = null) {

        /* checkActiveState()___________________________________________________
        Check adapter sensitive active state of device                         */

        return Adapters.internal.checkActiveState(checkValue, type, trueValue);

    }

    /* =========================================================
        Zigbee2MQTT / Node-RED Interface Data Exchange 
       ========================================================= */
    this.requestCount = 0;
    smartHomeBackend.prototype.getDatapoints = function (deviceIds, nextFunction, thisAdapter = null) {

        /* getDatapoints()_______________________________________________________
        Gets multiple Node-RED adapter datapoint values of given ids            */

        // FUNCTION ACCEPTS ARRAY OR CSV-STRING
        if (typeof deviceIds === 'string') {
            deviceIds   = deviceIds.split(',');
        }

        var returnValue = this.getBulkData(deviceIds.filter(id => { return !id.startsWith('/'); }), function (returnValues, thisAdapter) {
            
            // API CALLS
            thisAdapter.requestCount = deviceIds.filter(apiId => { return apiId.startsWith('/'); }).length
            if (thisAdapter.requestCount > 0) {

                deviceIds.filter(apiId => { return apiId.startsWith('/'); }).forEach(function (apiId) {

                    var call            = Adapters.internal.parseExpression(apiId.substring(1));
                    var requestCall     = thisAdapter.getRequestCall('api', call);

                    SmartHomeUI.InterfaceRequest.send(thisAdapter.adapterLocation + requestCall, null, function (requestAnswer, thisAdapter) {
                        returnValues.push({ id: apiId, val: requestAnswer });

                        thisAdapter.requestCount--;
                        if (thisAdapter.requestCount == 0) {
                            if (Adapters.smarthome.refreshTrigger == null) Adapters.smarthome.initWebSocket();
                            nextFunction(returnValues);
                        }
                    }, thisAdapter, URL_ENCODED);
                });

            } else {

                // REFRESH IF DATA HAS CHANGED ONLY
                if (Adapters.smarthome.refreshTrigger == null) Adapters.smarthome.initWebSocket();
                nextFunction(returnValues);

            }
        }, this);

    }

    smartHomeBackend.prototype.initWebSocket = function () {

        /* initWebSocket()_______________________________________________________
        Initializes a WebSocket object for trigger based refreshes.             */

        this.refreshTrigger             = new WebSocket(webSocketUrl);
        this.refreshTrigger.onmessage   = (event) => {

            if (typeof event.data === 'string' && event.data == '#ping#') {

                // PING DO KEEP CONNECTION ALIVE
                var clientInfo          = {};
                clientInfo.message      = 'pong';
                clientInfo.id           = this.clientId;
                clientInfo.attributes   = document.location.search.startsWith('?') ? document.location.search.substring(1) : null;
                clientInfo.environment  = navigator.userAgent;
                clientInfo.language     = navigator.language;
                clientInfo.origin       = window.origin;
                clientInfo.location     = GET_VARS['location'];

                this.refreshTrigger.send(JSON.stringify(clientInfo));
                
            } else {
                                
                var data                = JSON.parse(event.data);
                
                if (data.callAction != undefined) {

                    if (this.actions[data.id] == undefined) {
                        this.actions[data.id] = { };

                        switch (data.callAction.toLowerCase()) {

                            case 'msg':
                            case 'message':
                                SmartHomeUI.MessageBox.show(data.payload.msg, true);
                                break;
                            case 'show':
                                SmartHomeUI.showView(data.payload.view, null, null, (data.payload.autoHome != undefined && data.payload.autoHome ? (data.payload.autoTimeout != undefined ? data.payload.autoTimeout : 30000) : null));
                                break;
                            case 'script':
                                eval(data.payload.script);
                                break;
                                
                        };

                        this.actions[data.id].status = 'done';
                    }

                } else {

                    // TRIGGER REFRESH ON UPDATE
                    var datapoints          = this.datapoints.split(',');
                    var currentDatapoint    = null;

                    datapoints.forEach(datapoint => {

                        if (datapoint == data.source || datapoint.startsWith(data.source + '.') || datapoint.startsWith(data.source + '&') || datapoint.startsWith(data.source + '?') || (data.others != undefined && data.others != null && data.others.includes(datapoint))) {
                            currentDatapoint = (data.once ? '!' : '') + datapoint;
                            if (!this.refreshDatapoints.includes(currentDatapoint)) this.refreshDatapoints.push(currentDatapoint);
                        }
                    });

                    if (this.refreshDatapoints.length > 0) {
                        this.doRefresh = true;   
                        refreshStates(true, false, this.adapterName);
                    }
                }
            }
        };

        this.refreshTrigger.onclose = (event) => {

            // ADAPTER WAS CLOSED FROM SERVER-SIDE
            Adapters.smarthome.initWebSocket();
            
        };

    }

    smartHomeBackend.prototype.setDatapoint = function (deviceId, requestMode = 'scene', payload = null, nextFunction = null, thisAdapter = null, refreshControl = null) {

        /* setDatapoint()________________________________________________________
        Sets datapoint to given value via Zigbee2MQTT/Node-RED interface        */

        var requestCall     = this.getRequestCall(deviceId, requestMode, payload);

        SmartHomeUI.InterfaceRequest.send(this.adapterLocation + requestCall, null, function (requestAnswer, thisAdapter) {

            if (nextFunction != null) nextFunction(requestAnswer, thisAdapter, refreshControl);

        }, this, URL_ENCODED);

    }

    /* =========================================================
    Zigbee2MQTT / Node-RED Specific Data Hanlding 
    ========================================================= */
    smartHomeBackend.prototype.getBulkData = function (bindings, nextFunction, sender = null) {

        /* getBulkData()___________________________________________________
        Gets multiple datapoints from NodeRED Interface                   */
        
        var uri             = this.adapterLocation + '/api/getbulk?bindings=' + encodeURIComponent(JSON.stringify(bindings)) + '&clientId=' + this.clientId;
    
        SmartHomeUI.InterfaceRequest.send(uri, null, function (requestAnswer) {

            if (nextFunction != null) nextFunction(requestAnswer, sender);
            
        }, null, URL_ENCODED);

    }

    smartHomeBackend.prototype.getDataFromInterface = function (uri, binding, bindingProperty, nextFunction, sender = null) {

        /* getDataFromInterface()________________________________________________________
        Gets datapoint of device via Zigbee2MQTT/Node-RED interface             */

        SmartHomeUI.InterfaceRequest.send(uri, null, function (requestAnswer) {

            value = {
                id: binding + (bindingProperty != undefined && bindingProperty != null ? '.' + bindingProperty : ''),
                val: (bindingProperty != undefined && bindingProperty != null ? requestAnswer[bindingProperty] : requestAnswer)
            };

            if (nextFunction != null) nextFunction(value, sender);
            
        }, null, URL_ENCODED);
        
    }

    smartHomeBackend.prototype.getClimateData = function (binding, bindingProperty, nextFunction) {

        /* getClimateData()______________________________________________________
        Gets datapoint of climate device via Zigbee2MQTT/Node-RED interface     */

        var uri = this.adapterLocation + '/climate/get' + '?deviceId=' + binding + (bindingProperty != undefined && bindingProperty != null ? '&property=' + bindingProperty : '');

        SmartHomeUI.InterfaceRequest.send(this.adapterLocation + '/climate/get' + '?deviceId=' + binding + (bindingProperty != undefined && bindingProperty != null ? '&property=' + bindingProperty : ''), null, function (requestAnswer) {

            value = {
                id: binding + (bindingProperty != undefined && bindingProperty != null ? '.' + bindingProperty : ''),
                val: (bindingProperty != undefined && bindingProperty != null ? requestAnswer[bindingProperty] : requestAnswer)
            };

            if (nextFunction != null) nextFunction(value);

        }, null, URL_ENCODED);

    }

smartHomeBackend.prototype.getRequestCall = function (deviceId, request = 'scene', payload = null) {

        /* getRequestCall()______________________________________________________
        Returns http request call for given Node-RED-Adapter method             */

        if (request.toLowerCase() == 'scene') 
            return '/api/scene' + '?sceneId=' + payload.sceneId + '&deviceId=' + deviceId;
        else if (request.toLowerCase() == 'get') 
            return '/api/get' + '?deviceId=' + deviceId;
        else if (request.toLowerCase() == 'set') 
            return '/api/set' + '?set=' + encodeURIComponent(JSON.stringify(payload.set)) + '&deviceId=' + deviceId;
        else if (request.toLowerCase() == 'toggle' || request.toLowerCase() == 'trigger') 
            request = 'toggle';
        
        return '/api/' + request + (payload != null ? getRequestProperties(payload) : '');
    }
}