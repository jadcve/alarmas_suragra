// src/common/dependencies.js
import sql from 'mssql';
import s from 'underscore.string';
import formatNumber from 'simple-format-number';
import moment from 'moment';
import 'moment/locale/es.js';
import asyncLib from 'async';

moment.locale('es');

export { sql, s, formatNumber, moment, asyncLib };
