import { ui } from '@joint/plus';

const baseUrl = 'assets/help';

export class HelpService {
    
    async openHelp(type, target) {
        const helpHtml = await (await fetch(`${baseUrl}/${type}.html`)).text();
        
        const popup = new ui.Popup({
            content: helpHtml,
            target: target,
            anchor: 'left',
            position: 'right',
            arrowPosition: 'none'
        });
        popup.render();
    }
}
