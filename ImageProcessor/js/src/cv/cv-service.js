import * as cv from '@techstark/opencv-js';

export class CVService {
    worker;
    channel;
    
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
    
    async do(name, data = []) {
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
        
        const result = await workerWrapper(convertedData);
        if (result instanceof Array && result.length === 4) {
            return cv.matFromArray(result[0], result[1], result[2], result[3]);
        }
        else {
            return result;
        }
    }
}
