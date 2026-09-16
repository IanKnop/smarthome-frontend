/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Common Functions
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

const DEFAULT_CONTROL       = 'canvas';
const DEFAULT_LIST_CONTROL  = 'list';
const HTTP_REQUEST_TIMEOUT  = 15000;
const URL_ENCODED           = 'application/x-www-form-urlencoded';

var ControlProviders = {};

var SmartHomeUI = new function () {

    this.hasOpenWindows = false;

    this.initialize = function () {

        SmartHomeUI.Audio.initializeAudio();
        if (blockScreenSaver == undefined || blockScreenSaver == false) SmartHomeUI.SleepScreen.initialize();

        // INITIAL SOUND
        SmartHomeUI.Audio.playSound('VIEW');
    }

    var GET_VARS = [];
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(a,name,value){GET_VARS[name]=value;});

    /*  =========================================================
         NAVIGATION
        =========================================================  */

    this.showVariant = function (variantId, sound = null) {

        /* showVariant()_______________________________________________________
        Shows variant of current view                                         */

        this.showView(currentView, variantId, sound);
    }

    this.showView = function (viewId, variantId = null, sound = null, backhome = null) {

        /* showView()__________________________________________________________
        Changes current view to given page id                                 */

        if (sound == null) sound = soundEnabled;

        window.location = '?view=' + viewId + 
                          (variantId != null ? '&variant=' + variantId : '') + 
                          (sound ? '&sound=' + sound : '') + 
                          (GET_VARS['config'] != undefined ? '&config=' + GET_VARS['config'] : '') +
                          (GET_VARS['location'] != undefined ? '&location=' + GET_VARS['location'] : '') + 
                          (backhome != null ? '&return=' + backhome : '');
    }

    this.openWindow = function (windowId) {

        /* openWindow()________________________________________________________
        Opens a window                                                        */

        this.hasOpenWindows = true;
        document.getElementById('window-container-' + windowId).style.visibility = 'visible';
        
        refreshStates(true);

    }

    this.closeWindow = function (windowId) {

        /* closeWindow()_______________________________________________________
        Opens a window                                                        */
        
        this.hasOpenWindows = false;
        document.getElementById('window-container-' + windowId).style.visibility = 'collapse';

    }

    this.isWindowControl = function(control) {

        /* isWindowControl()___________________________________________________
        Checks if control is child of window                                  */

        while (control.parentNode != undefined) {

            if (control.className == 'window-container') return true; 
            control = control.parentNode;
        }

        return false;
        
    }

    this.isHiddenWindowControl = function(control) {

        /* isHiddenWindowControl()_____________________________________________
        Checks if control is a child of a hidden window                       */

        while (control.parentNode != null) {

            if (control.className == 'window-container' && (control.style.visibility == 'collapse' || control.style.visibility == 'hidden'))  return true;
            control = control.parentNode;

        }

        return false;
    }

    this.areHiddenWindowControls = function(controlArray) {

        /* areHiddenWindowControls()__________________________________________
        Checks if ALL controls in array are hidden window controls            */

        var returnValue = true;


        controlArray.forEach(function(control) {
            
            if (!SmartHomeUI.isHiddenWindowControl(control)) {
                returnValue = false;
            }

        });

        return returnValue;

    }

    /*  =========================================================
         UI
        =========================================================  */
    this.showWaitAnimation = function (duration = null) {

        /* showWaitAnimation()________________________________________________
        Show wait animation during processes                                 */

        document.getElementById('cc-ping').style.visibility = 'visible';

        if (duration != null) setTimeout(function () {
            hidePing();
        }, duration);
    }

    this.hideWaitAnimation = function () {

        /* hideWaitAnimation()________________________________________________
        Hide wait animation                                                  */

        document.getElementById('cc-ping').style.visibility = 'collapse';
    }

    this.isPortraitMode = function() {

        /* isPortraitMode()____________________________________________________
        Checks if currently in portrait mode                                  */

        if (window.screen.availHeight > (window.screen.availWidth * 1.25)) return true;
        else return false;
    }

    /*  =========================================================
         INTERFACE REQUESTS 
        =========================================================  */
    this.InterfaceRequest = new function () {

        this.send = function (url, data, returnFunction = null, paramValue = null, contentType = 'application/json; charset=UTF-8', method = 'GET', headers = null) {

            /* send()_____________________________________________________________
            Send interface request as JSON object                                */

            var httpRequest = new XMLHttpRequest();

            if (method.toUpperCase() == 'GET' && data != null) {
                
                url += this.getParameters(data);
                data = null;
            }

            httpRequest.timeout = HTTP_REQUEST_TIMEOUT;
            httpRequest.ontimeout = function (a) {

                returnFunction([]);
            };

            httpRequest.onreadystatechange = function () {
                if (returnFunction != null && this.readyState == 4 && this.status == 200) {
                    if (paramValue != null) {
                        try {
                            returnFunction(JSON.parse(this.responseText != '' ? this.responseText : '{}'), paramValue);
                        } catch (err) {
                            // ERROR
                        }
                    } else {
                        try {
                            returnFunction(JSON.parse(this.responseText != '' ? this.responseText : '{}'));
                        } catch (err) {
                            // ERROR
                        }
                    }
                } else {
                    //httpRequest.abort();
                }
            };

            httpRequest.open(method, url, true);
            httpRequest.setRequestHeader('Content-type', contentType);

            // Additional Headers
            if (headers != null) headers.forEach(header => {  httpRequest.setRequestHeader(header.id, header.value); });

            httpRequest.send(data);
        }

        this.urlExists = function (url) {

            /* urlExists()________________________________________________________
            Checks wearther url exists                                           */

            var http = new XMLHttpRequest();

            http.open('HEAD', url, false);
            http.send();

            return (http.status == 200);
        }

        this.getParameters = function(payload) {

            /* getParameters()________________________________________________________
            Gets parameters for GET request from object                              */

            var returnValue = '?';
            Object.keys(payload).forEach(key => { returnValue += key + '=' + payload[key].toString() + '&'; });

            return returnValue.substring(0, returnValue.length - 1);
            
        }
    }

    /*  =========================================================
         SLEEP SCREEN
        =========================================================  */
    this.SleepScreen = new function () {

        // PROPERTIES
        this.activated          = true;
        this.delaySleep         = DELAY_SLEEP;
        this.delayDimming       = DELAY_DIM;
        this.dimAfterHour       = DIM_START;
        this.dimBeforeHour      = DIM_END;

        this.wallpaper          = WALLPAPER;
        this.wallpaperId        = WALLPAPER_START;
        this.wallpaperTime      = WALLPAPER_TIME;
        this.wallpaperInterval  = null;
        this.wallpaperClockCols = WALLPAPER_CLOCK_COLOR;

        // STATES PROPERTIES
        this.isWakingUp         = false;
        this.isGoingToSleep     = false;

        // INTERNAL VARIABLES
        var sleepTimeoutHandle  = null;
        var dimTimeoutHandle    = null;
        var iterationCount      = 0;
        var lastSleep           = null;

        this.initialize = function () {

            /* initialize()____________________________________________
            Sets events to recognize user activity                               */

            var wakeUpEvents = ["mousedown", "mousemove", "touchstart"];
            
            if (SmartHomeUI.SleepScreen.activated) {

                wakeUpEvents.forEach(eventId => window.addEventListener(eventId, function (event) { interruptSleep(event); }));
                
                var sleepScreen             = document.getElementById('cc-screensaver');
                
                if (Array.isArray(SmartHomeUI.SleepScreen.wallpaper)) {
                    
                    // PRELOAD WALLPAPER IMAGES
                    SmartHomeUI.SleepScreen.wallpaper.forEach(wallpaper => {

                        var newLink     = document.createElement('link');
                        newLink.href    = 'img/wallpaper/' + wallpaper;
                        newLink.rel     = 'preload';
                        newLink.as      = 'image';
                
                        document.head.appendChild(newLink);
                    })

                } else {

                    document.head.writeln('<link rel="preload" href="img/wallpaper/' + SmartHomeUI.SleepScreen.wallpaper + '" as="image"></link>');

                }
                
                doSleepScreenInterval();
            }
        }

        this.show = function () {

            /* show()__________________________________________________
            Shows screen saver                                        */

            var sleepScreen         = document.getElementById('cc-screensaver');
            var sleepScreenClock    = document.getElementById('cc-screensaver-clock');

            if (sleepScreen != undefined && sleepScreen != null) {

                // SET WALLPAPER
                //var wallpaperCookie = this.getCookie('wallpaperId');
                //if (wallpaperCookie != undefined && wallpaperCookie != null) this.wallpaperId = wallpaperCookie;

                this.showWallpaper(this.wallpaperId);

                var sender = this;
                this.wallpaperInterval = setInterval(function() {
                    sender.showWallpaper((sender.wallpaperId < sender.wallpaper.length - 1) ? Number(sender.wallpaperId) + 1 : 0);
                }, WALLPAPER_TIME);

                // FADE IN SLEEP SCREEN
                fadeIn('cc-screensaver');

                SmartHomeUI.SleepScreen.isGoingToSleep = true;
                setTimeout(function () {

                    sleepScreen.style.opacity = 1;

                    SmartHomeUI.SleepScreen.isGoingToSleep = false;
                    lastSleep = new Date();

                }, getFadeInTime());
            }
        }

        this.showWallpaper = function(wallpaperId) {

            var sleepScreen         = document.getElementById('cc-screensaver');
            var sleepScreenClock    = document.getElementById('cc-screensaver-clock');
            var sleepScreenDate     = document.getElementById('cc-screensaver-date');

            sleepScreen.style.transition        = '3s';
            sleepScreen.style.display           = 'flex';

            sleepScreen.style.backgroundImage   = 'url(\'img/wallpaper/' + SmartHomeUI.SleepScreen.wallpaper[wallpaperId]  + '\')';
            document.documentElement.style.setProperty('--wallpaper-clock-color', SmartHomeUI.SleepScreen.wallpaperClockCols[wallpaperId] != undefined ? SmartHomeUI.SleepScreen.wallpaperClockCols[wallpaperId] : '#fff');

            document.cookie                     = 'wallpaperId=' + wallpaperId + ';path=/';
            this.wallpaperId                    = wallpaperId;

        }

        this.hide = function () {

            /* hide()__________________________________________________
            Hides screen saver                                                   */

            // STOP DIM SCREEN FROM POPPING UP
            clearTimeout(dimTimeoutHandle);

            // FADE OUT CURRENTLY RUNNING SLEEP SCREEN
            fadeOut('cc-screensaver');
            SmartHomeUI.SleepScreen.undim();

            SmartHomeUI.SleepScreen.isWakingUp = true;
            setTimeout(function () {

                document.getElementById('cc-screensaver').style.opacity = 0;
                document.getElementById('cc-screensaver').style.display = 'none';

                SmartHomeUI.SleepScreen.isWakingUp = false; iterationCount = 0;
                lastSleep = null;

                if (Array.isArray(SmartHomeUI.SleepScreen.wallpaper)) clearInterval(this.wallpaperInterval);
               
            }, getFadeOutTime());

        }

        this.dim = function () {

            /* dim()______________________________________________________________
            Shows additional dim screen overlay for night time                   */

            document.getElementById('cc-screensaver-dim').style.display = 'block';
            fadeIn('cc-screensaver-dim');
        }

        this.undim = function () {

            /* undim()____________________________________________________________
            Hides dim screen                                                     */

            fadeOut('cc-screensaver-dim');
            setTimeout(function () { document.getElementById('cc-screensaver-dim').style.display = 'none'; }, getFadeOutTime());
        }

        this.getCookie = function(id) {

            var returnValue = null;

            if (document.cookie != undefined && document.cookie != null) {

                document.cookie.split(';').every(element => {
                    if (element.split('=')[0] == id) {
                        returnValue = element.split('=')[1];
                    }
                })

            }
            
            return returnValue;
    
        }

        function doSleepScreenInterval() {

            /* doSleepScreenInterval()_______________________________________________________
            Checks user activity after SCEEN_SAVER_WAIT seconds                  */

            sleepTimeoutHandle = setInterval(function () {

                iterationCount++;
                if (iterationCount == SmartHomeUI.SleepScreen.delaySleep && !SmartHomeUI.hasOpenWindows && !SmartHomeUI.isPortraitMode()) {

                    // SCREENSAVER IF NO USER ACTION
                    iterationCount = 0;
                    if (!SmartHomeUI.SleepScreen.isWakingUp && !SmartHomeUI.SleepScreen.isGoingToSleep && !isSleeping()) SmartHomeUI.SleepScreen.show();
                }

                // DIM SCREEN IF SCREEN SAVER ACTIVE AND WAITING TIME PASSED
                var now = new Date();

                if (lastSleep != null && isSleeping() && !isDimmed() && (now - lastSleep) >= (SmartHomeUI.SleepScreen.delayDimming * 1000) && (now.getHours() >= SmartHomeUI.SleepScreen.dimAfterHour || now.getHours() <= SmartHomeUI.SleepScreen.dimBeforeHour)) {

                    SmartHomeUI.SleepScreen.dim();
                }
                else if (isDimmed() && now.getHours() < SmartHomeUI.SleepScreen.dimAfterHour && now.getHours() > SmartHomeUI.SleepScreen.dimBeforeHour) {

                    SmartHomeUI.SleepScreen.undim();
                }

            }, 1000);
        }

        function interruptSleep(event = null) {

            /* interruptSleep()___________________________________________________
            User interrupts sleep by touching screen or moving mouse             */

            if ((event != null && (event.srcElement == undefined || !isCanvasButton(event.srcElement))) && isSleeping()) SmartHomeUI.SleepScreen.hide();
            else iterationCount = 0;
        }

        function isSleeping() {

            /* isSleeping()_______________________________________________________
            Checks if screen saver is shown currently                            */

            return (document.getElementById('cc-screensaver') != null && hasClass('cc-screensaver', 'screensaver-fadeIn'));

        }

        function isDimmed() {

            /* isDimmed()_________________________________________________________
            Checks if dim screen is visible                                      */

            return (document.getElementById('cc-screensaver-dim') != null && hasClass('cc-screensaver-dim', 'screensaver-fadeIn'));

        }

        function isCanvasButton(senderElement) {

            /* isCanvasButton()___________________________________________________
            Checks if user touched sleep screen control (avoid waking up)        */

            return (senderElement.classList.contains('switch-control') || senderElement.classList.contains('select-control') || senderElement.classList.contains('button-image'));
        }

        function getFadeInTime() {

            return parseInt(getVar('--fade-in-duration')) * 1000;
        }

        function getFadeOutTime() {

            return parseInt(getVar('--fade-out-duration')) * 1000;
        }

        function fadeOut(target) {

            removeClass(target, 'screensaver-fadeIn');
            addClass(target, 'screensaver-fadeOut');

        }

        function fadeIn(target) {

            removeClass(target, 'screensaver-fadeOut');
            addClass(target, 'screensaver-fadeIn');

        }
    }

    /*  =========================================================
         AUDIO
        =========================================================  */
    this.Audio = new function () {

        this.soundBaseFolder = 'sounds/';
        this.soundEffects = ["computerbeep_4.mp3", "computerbeep_17.mp3", "keyok1.mp3", "keyok2.mp3", "keyok3.mp3"];

        this.initializeAudio = function () {

            /* initializeAudio - Initialize special audio driver for avoiding lags on iOS */
            lowLag.init({ 'force': 'audioContext' });

            this.soundEffects.forEach(fileName => {
                lowLag.load(this.soundBaseFolder + fileName);
            });
        }

        this.playSound = function (soundId, volume = 1) {

            /* playSound - Play audio file by pseudonym (all files should be preloaded first) */
            if (soundEnabled)
            switch (soundId.toUpperCase()) {

                case 'KEY1':
                    lowLag.play(this.soundBaseFolder + 'keyok1.mp3');
                    break;
                case 'KEY2':
                    lowLag.play(this.soundBaseFolder + 'keyok2.mp3');
                    break;
                case 'KEY3':
                    lowLag.play(this.soundBaseFolder + 'keyok3.mp3');
                    break;
                case 'VIEW':
                    lowLag.play(this.soundBaseFolder + 'computerbeep_4.mp3');
                    break;
                case 'SCENE':
                    lowLag.play(this.soundBaseFolder + 'computerbeep_17.mp3');
                    break;
            }
        }
    }

    /*  =========================================================
         MESSAGE BOX
        =========================================================  */
    this.MessageBox = new function () {

        this.show = function (message, showClose = false, autoClose = -1, nextFunction = null) {

            /* show()_____________________________________________________________
            Show Message Box with info text                                      */

            document.getElementById('cc-msgbox-text').innerHTML = message;
            document.getElementById('cc-msgbox').style.visibility = 'visible';
            document.getElementById('cc-msgbox-close').style.visibility = (showClose ? 'visible' : 'collapse');

            if (autoClose != -1) setTimeout(this.close, autoClose, nextFunction);
        }

        this.close = function (nextFunction = null) {

            /* close()____________________________________________________________
            Close Message Box                                                    */

            document.getElementById('cc-msgbox').style.visibility = 'collapse';
            document.getElementById('cc-msgbox-close').style.visibility = 'collapse';
            if (nextFunction != null) nextFunction(true);

        }
    }

    /*  =========================================================
         KEYBOARD
        =========================================================  */
    this.Keyboard = new function () {

            this.currentValueId     = null;
            this.callback           = null;

            this.isUpperCase        = true;

            this.presetFilter       = false;
            this.presetFilterMode   = 'startsWith';

            this.show = function (valueId, callback = null, payload = null) {
    
                /* show()_____________________________________________________________
                Show Keyboard                                                        */
    
                this.currentValueId = valueId;
                if (callback != null) this.callback = callback;
                
                var presetHtml = '';
                if (payload != null && payload.presets != undefined && payload.presets != [ ]) {
                    this.presetFilter       = payload.presetFilter != undefined && payload.presetFilter == true;
                    this.presetFilterMode   = payload.presetFilterMode != undefined ? payload.presetFilterMode : 'startsWith';
                    payload.presets.forEach(preset => {
                        presetHtml += '<span style="min-width: fit-content; font-size: 3vh; border: 1px solid #ffffff8f; background: #ffffff1f; border-bottom: 1px solid #0000008f; border-right: 1px solid #0000008f; border-radius: 5px; margin: 2.5px; padding: 10px; padding-top: 2px; padding-bottom: 2px;" onclick="SmartHomeUI.Keyboard.setPreset(this, ' + (payload.presetClose != undefined ? payload.presetClose.toString() : 'false') + ');">' + preset + '</span>';
                    });
                }
                document.getElementById('cc-keyboard-text').innerHTML       = (valueId != null ? eval('Dataset.' + valueId) : '');
                document.getElementById('cc-keyboard').style.visibility     = 'visible';
                document.getElementById('cc-keyboard-presets').innerHTML    = presetHtml;
            }
    
            this.setPreset = function(sender, close = false) {

                document.getElementById('cc-keyboard-text').innerHTML       = sender.innerHTML;
                if (close) this.save();
                
            }

            this.close = function (nextFunction = null) {
    
                /* close()____________________________________________________________
                Close Message Box                                                    */
    
                document.getElementById('cc-keyboard').style.visibility = 'collapse';
                if (nextFunction != null) nextFunction(true);
    
            }

            this.shift = function () {
            
                for (var index = 0; index <= 41; index++) {

                    if (index <= 10) {
                        
                        switch (index) {

                            case 1:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '!';
                                else document.getElementById('cc-key-' + index).innerHTML = '1';
                                break;
                            case 2:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '"';
                                else document.getElementById('cc-key-' + index).innerHTML = '2';
                                break;
                            case 3:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '§';
                                else document.getElementById('cc-key-' + index).innerHTML = '3';
                                break;
                            case 4:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '$';
                                else document.getElementById('cc-key-' + index).innerHTML = '4';
                                break;
                            case 5:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '%';
                                else document.getElementById('cc-key-' + index).innerHTML = '5';
                                break;
                            case 6:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '&';
                                else document.getElementById('cc-key-' + index).innerHTML = '6';
                                break;
                            case 7:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '/';
                                else document.getElementById('cc-key-' + index).innerHTML = '7';
                                break;
                            case 8:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '(';
                                else document.getElementById('cc-key-' + index).innerHTML = '8';
                                break;
                            case 9:
                                if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = ')';
                                else document.getElementById('cc-key-' + index).innerHTML = '9';
                                break;
                            case 0:
                                if (this.isUpperCase) document.getElementById('cc-key-0').innerHTML = '=';
                                else document.getElementById('cc-key-0').innerHTML = '0';
                                break;
                        }
                    }
                    if (index >= 10 && index <= 38) {
                        if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = document.getElementById('cc-key-' + index).innerHTML.toLocaleLowerCase();
                        else document.getElementById('cc-key-' + index).innerHTML = document.getElementById('cc-key-' + index).innerHTML.toLocaleUpperCase();
                    } else if (index == 39) {
                        if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = '_';
                        else document.getElementById('cc-key-' + index).innerHTML = '-';
                    } else if (index == 40) {
                        if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = ':';
                        else document.getElementById('cc-key-' + index).innerHTML = '.';
                    } else if (index == 41) {
                        if (this.isUpperCase) document.getElementById('cc-key-' + index).innerHTML = ';';
                        else document.getElementById('cc-key-' + index).innerHTML = ',';
                    }
                }
                
                if (this.isUpperCase) document.getElementById('cc-key-shift').innerHTML = 'a → A';
                else document.getElementById('cc-key-shift').innerHTML = 'A → a';

                this.isUpperCase = !this.isUpperCase;
            }

            this.key = function (sender) {

                document.getElementById('cc-keyboard-text').innerHTML += sender.innerHTML;
                if (this.isUpperCase) this.shift();
                this.filter();
            }

            this.space = function () {

                document.getElementById('cc-keyboard-text').innerHTML += ' ';
                if (!this.isUpperCase) this.shift();
                this.filter();

            }

            this.erase = function () {

                var newValue = document.getElementById('cc-keyboard-text').innerHTML.substring(0, document.getElementById('cc-keyboard-text').innerHTML.length - 1);
                document.getElementById('cc-keyboard-text').innerHTML = document.getElementById('cc-keyboard-text').innerHTML.substring(0, document.getElementById('cc-keyboard-text').innerHTML.length - 1);

                if (newValue == '' && !this.isUpperCase) this.shift();
                this.filter();

            }

            this.eraseAll = function () {

                var newValue = '';
                document.getElementById('cc-keyboard-text').innerHTML = '';

                if (newValue == '' && !this.isUpperCase) this.shift();
                this.filter();

            }

            this.filter = function() {

                if (this.presetFilter == true) {
                    document.getElementById('cc-keyboard-presets').childNodes.forEach(child => {
                        if (document.getElementById('cc-keyboard-text').innerHTML.trim() != '' && !eval('child.innerHTML.toLowerCase().' + this.presetFilterMode + '(document.getElementById(\'cc-keyboard-text\').innerHTML.toLowerCase());'))
                            child.style.display = 'none';
                        else 
                            child.style.display = 'unset';
                    })
                }

            }

            this.save = function () {
            
                if (this.currentValueId != null) sendRequest('internal', 'value', { "target": this.currentValueId, "mode": "set", "value": document.getElementById('cc-keyboard-text').innerHTML }, this, '');
                if (this.callback != null) this.callback(document.getElementById('cc-keyboard-text').innerHTML);
                
                this.close();

            }

        }
}

/* =========================================================
   BASE - HTTP REQUESTS
   ========================================================= */

function moduleSimpleRefreshState(className, control, iteration, frequency) {

    if (iteration == frequency) {

        SmartHomeUI.InterfaceRequest.send('index.php?request=module&class=' + className, null, function (returnValue) {

            var refreshContent = new DOMParser().parseFromString(urlDecode(returnValue.message), "text/html");
            document.getElementById(control.id).innerHTML = refreshContent.getElementById(control.id).innerHTML;
        });

        return 0;

    } else return (iteration + 1);
}


