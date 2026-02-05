var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as cv from '@techstark/opencv-js';

export class CVService {
    
    constructor(ready) {
        this.worker = new Worker(new URL('./cv-worker.js', import.meta.url));
        this.channel = new MessageChannel();
        
        this.channel.port1.onmessage = ({ data }) => {
            this.channel.port1.close();
            
            if (data.error) {
                ready(data.error);
            }
            else {
                ready();
            }
        };
        
        this.worker.postMessage({ msg: 'load' }, [this.channel.port2]);
    }
    
    do(name_1) {
        return __awaiter(this, arguments, void 0, function* (name, data = []) {
            const workerWrapper = (data) => new Promise((res, rej) => {
                const channel = new MessageChannel();
                
                channel.port1.onmessage = ({ data }) => {
                    channel.port1.close();
                    
                    if (data.error) {
                        rej(data.error);
                    }
                    else {
                        res(data.result);
                    }
                };
                
                this.worker.postMessage({ msg: name, data: data }, [channel.port2]);
            });
            
            const convertedData = data.map(o => {
                if (o instanceof cv.Mat) {
                    return [o.rows, o.cols, o.type(), o.data];
                }
                return o;
            });
            
            const result = yield workerWrapper(convertedData);
            if (result instanceof Array && result.length === 4) {
                return cv.matFromArray(result[0], result[1], result[2], result[3]);
            }
            else {
                return result;
            }
        });
    }
}
