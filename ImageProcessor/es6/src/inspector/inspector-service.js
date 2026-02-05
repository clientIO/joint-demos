var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ui } from '@joint/plus';

export class InspectorService {
    constructor(element) {
        this.element = element;
        this.renderHelp();
    }
    
    open(node) {
        const opts = Object.assign({ cell: node }, node.getInspectorConfig());
        
        this.element.innerHTML = '';
        const inspector = ui.Inspector.create(this.element, opts);
        
        for (let prop in node.inputProperties) {
            this.disable(prop, node);
        }
        
        inspector.on('render', () => {
            for (let prop in node.inputProperties) {
                this.disable(prop, node);
            }
        });
        
        inspector.on('close', () => {
            this.renderHelp();
        });
        
        return inspector;
    }
    
    close() {
        ui.Inspector.close();
    }
    
    disable(property, node) {
        if (!ui.Inspector.instance)
            return;
        
        const inspectorNode = ui.Inspector.instance.getModel();
        if (inspectorNode === node) {
            const element = this.element.querySelector(`.field[data-field="properties/${property}"]`);
            if (element) {
                const input = element.querySelector('input');
                if (input) {
                    input.setAttribute('disabled', 'true');
                }
            }
        }
    }
    
    enable(property, node) {
        if (!ui.Inspector.instance)
            return;
        
        const inspectorNode = ui.Inspector.instance.getModel();
        if (inspectorNode === node) {
            const element = this.element.querySelector(`.field[data-field="properties/${property}"]`);
            if (element) {
                const input = element.querySelector('input');
                if (input) {
                    input.removeAttribute('disabled');
                }
            }
        }
    }
    
    renderHelp() {
        return __awaiter(this, void 0, void 0, function* () {
            const helpHtml = yield (yield fetch('assets/inspector/help.html')).text();
            
            if (!ui.Inspector.instance) {
                this.element.innerHTML = helpHtml;
            }
        });
    }
}

