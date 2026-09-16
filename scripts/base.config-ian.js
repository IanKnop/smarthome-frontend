/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Settings
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

const DELAY_SLEEP           = 30;                    // seconds until sleep mode begins
const DELAY_DIM             = 30;                    // seconds more until dimming is activated if between DIM_START and DIM_END 

const NO_SLEEP_IN_PORTRAIT  = true;                  // do not activate sleepscreen when in portrait mode (mobile devices)

const DIM_START             = 23;                    // xx:00 time (24h) dimming is activated
const DIM_END               = 7;                     // xx:00 time (24h) dimming is de-activated

const WALLPAPER_START       = 1;
const WALLPAPER_TIME        = 900000; //900000;      // Time between Wallpapers in Milliseconds (900000 = 15 Minutes)

const WALLPAPER             = [ 
    'wallpaper-A.jpg', 
    'wallpaper-B.jpg', 
    'wallpaper-C.jpg', 
    'wallpaper-D.jpg', 
    'wallpaper-E.jpg', 
    'wallpaper-F.jpg', 
    'wallpaper-H.jpg', 
    'wallpaper-I.jpg', 
    'wallpaper-J.jpg' 
];    

const WALLPAPER_CLOCK_COLOR = [ 
    '#dfdacd', 
    '#d7d2cc', 
    '#eedccd', 
    '#e5d7cb', 
    '#d1d3d5', 
    '#dde3e7', 
    '#e4e3da', 
    '#eae7e1', 
    '#d0cdc6' 
];