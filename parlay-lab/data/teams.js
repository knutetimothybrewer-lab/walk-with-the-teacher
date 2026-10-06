/*
 * data/teams.js — the FICTIONAL league used by PARLAY LAB.
 *
 * Every team, city and person here is invented. No real teams, players or leagues.
 * To rename a team or change its style, edit the lines below (see README: "How to modify teams").
 *
 *   pace   = how many possessions the team likes per 48 minutes (higher = faster game)
 *   boost  = how much extra the team's players shoot at home (small number, 0.00 – 0.02)
 *   color / color2 = team colors used on the scoreboard and court
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  PL.Data = PL.Data || {};

  PL.Data.LEAGUE_NAME = 'Atlantic Valley Basketball League (fictional)';

  PL.Data.TEAMS = [
    { id: 'HCW', city: 'Harbor City',   nickname: 'Waves',     color: '#22b8e0', color2: '#0b3d5c', pace: 98,  boost: 0.010, coach: 'Elena Marsh',    arena: 'Seawall Arena' },
    { id: 'MTF', city: 'Metro',         nickname: 'Falcons',   color: '#f4b942', color2: '#3b2a05', pace: 100, boost: 0.008, coach: 'Dale Okafor',    arena: 'Skyline Center' },
    { id: 'IWB', city: 'Ironwood',      nickname: 'Bears',     color: '#b5651d', color2: '#2e1a08', pace: 94,  boost: 0.012, coach: 'Gus Lindqvist',  arena: 'The Lumberyard' },
    { id: 'SMS', city: 'Summit',        nickname: 'Storm',     color: '#8b7cf6', color2: '#221b5e', pace: 99,  boost: 0.009, coach: 'Priya Natarajan', arena: 'Peak Pavilion' },
    { id: 'RWR', city: 'Redwood',       nickname: 'Raptors',   color: '#e5484d', color2: '#4a0d10', pace: 101, boost: 0.007, coach: 'Tomas Varga',    arena: 'Canopy Court' },
    { id: 'CPK', city: 'Capital',       nickname: 'Knights',   color: '#4f7cff', color2: '#11204f', pace: 96,  boost: 0.010, coach: 'Hana Whitfield', arena: 'Monument Hall' },
    { id: 'LKL', city: 'Lakeside',      nickname: 'Lightning', color: '#d7e02b', color2: '#3b3d07', pace: 102, boost: 0.008, coach: 'Rafael Quinn',   arena: 'Shoreline Dome' },
    { id: 'VLF', city: 'Valley',        nickname: 'Foxes',     color: '#ff8a3d', color2: '#4d2306', pace: 97,  boost: 0.011, coach: 'Mina Castellan', arena: 'Hollow Gym' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
