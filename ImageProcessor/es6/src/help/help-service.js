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

const baseUrl = 'assets/help';

export class HelpService {
    
    openHelp(type, target) {
        return __awaiter(this, void 0, void 0, function* () {
            const helpHtml = yield (yield fetch(`${baseUrl}/${type}.html`)).text();
            
            const popup = new ui.Popup({
                content: helpHtml,
                target: target,
                anchor: 'left',
                position: 'right',
                arrowPosition: 'none'
            });
            popup.render();
        });
    }
}
