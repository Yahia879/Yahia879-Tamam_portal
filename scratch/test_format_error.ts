import { formatErrorMessage } from '../client/src/lib/utils';

const rawErr = `[ { "origin": "string", "code": "too_small", "minimum": 3, "inclusive": true, "path": [ "reason" ], "message": "يرجى كتابة سبب رفض الإغلاق" } ]`;
console.log('Result:', formatErrorMessage(rawErr));

const objErr = { message: rawErr };
console.log('Object Result:', formatErrorMessage(objErr));
