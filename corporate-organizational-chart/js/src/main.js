import { highlighters, dia, ui, shapes, layout, elementTools, util, setTheme, g } from '@joint/plus';
import './styles.css';

// https://en.wikipedia.org/wiki/Corporate_title
// https://www.indeed.com/career-advice/starting-new-job/business-roles
const roles = [
    {
        title: 'Chief academic officer',
        abbreviation: 'CAO',
        description:
            'Responsible for academic administration at universities and other higher education institutions'
    },
    {
        title: 'Chief accessibility officer',
        abbreviation: 'CAO',
        description:
            'Responsible for overseeing accessibility and inclusion for people with disabilities and seniors'
    },
    {
        title: 'Chief accounting officer',
        abbreviation: 'CAO',
        description:
            'Responsible for overseeing all accounting and bookkeeping functions, ensuring that ledger accounts, financial statements, and cost control systems are operating effectively'
    },
    {
        title: 'Chief administrative officer',
        abbreviation: 'CAO',
        description:
            'Responsible for business administration, including daily operations and overall performance'
    },
    {
        title: 'Chief analytics officer',
        abbreviation: 'CAO',
        description: 'Responsible for data analysis and interpretation'
    },
    {
        title: 'Chief architect',
        abbreviation: 'CA',
        description:
            'Responsible for designing systems for high availability and scalability, specifically in technology companies. Often called enterprise architects (EA).'
    },
    {
        title: 'Chief audit executive',
        abbreviation: 'CAE',
        description: 'Responsible for the internal audit'
    },
    {
        title: 'Chief brand officer',
        abbreviation: 'CBO',
        description:
            'Responsible for a brand\'s image, experience, and promise, and propagating it throughout all aspects of the company, overseeing marketing, advertising, design, public relations and customer service departments'
    },
    {
        title: 'Chief business officer',
        abbreviation: 'CBO',
        description:
            'Responsible for the company\'s deal making, provides leadership and execute a deal strategy that will allow the company to fulfill its scientific/technology mission and build shareholder value, provides managerial guidance to the company\'s product development staff as needed.'
    },
    {
        title: 'Chief business development officer',
        abbreviation: 'CBDO',
        description:
            'Responsible for business development plans, design and implementation of processes to support business growth'
    },
    {
        title: 'Chief commercial officer',
        abbreviation: 'CCO',
        description: 'Responsible for commercial strategy and development'
    },
    {
        title: 'Chief communications officer',
        abbreviation: 'CCO',
        description:
            'Responsible for communications to employees, shareholders, media, bloggers, influencers, the press, the community, and the public. Practical application of communication studies'
    },
    {
        title: 'Chief compliance officer',
        abbreviation: 'CCO',
        description:
            'Responsible for overseeing and managing regulatory compliance.'
    },
    {
        title: 'Chief content officer',
        abbreviation: 'CCO',
        description:
            'Responsible for developing and commissioning content for broadcasting channels and multimedia exploitation'
    },
    {
        title: 'Chief creative officer',
        abbreviation: 'CCO',
        description:
            'In one sense of the term, responsible for the overall look and feel of marketing, media, and branding. In another sense, similar to chief design officer.'
    },
    {
        title: 'Chief customer officer',
        abbreviation: 'CCO',
        description: 'Responsible for customer relationship management'
    },
    {
        title: 'Chief data officer',
        abbreviation: 'CDO',
        description:
            'Responsible for enterprise-wide governance and utilization of information and data as assets, via data processing, data analysis, data mining, information trading, and other means'
    },
    {
        title: 'Chief delivery officer',
        abbreviation: 'CDO',
        description:
            'Responsible for leading the project management office for project coordination, and facilitating product deliveries among clients worldwide'
    },
    {
        title: 'Chief design officer',
        abbreviation: 'CDO',
        description:
            'Responsible for overseeing all design aspects of a company\'s products and services, including product design, graphic design, user experience design, industrial design, and package design, and possibly aspects of advertising, marketing, and engineering'
    },
    {
        title: 'Chief development officer',
        abbreviation: 'CDO',
        description:
            'Responsible for activities developing the business, usually through added products, added clients, markets or segments'
    },
    {
        title: 'Chief digital officer',
        abbreviation: 'CDO',
        description:
            'Responsible for adoption of digital technologies, digital consumer experiences, the process of digital transformation, and devising and executing social strategies'
    },
    {
        title: 'Chief diversity officer',
        abbreviation: 'CDO',
        description:
            'Responsible for diversity and inclusion, including diversity training and equal employment opportunity'
    },
    {
        title: 'Chief engineering officer',
        abbreviation: 'CEngO',
        description:
            'Similar to the more common chief technology officer (CTO); responsible for technology/product R & D and manufacturing issues in a technology company, oversees the development of technology being commercialized'
    },
    {
        title: 'Chief executive officer',
        abbreviation: 'CEO',
        description:
            'Responsible for the overall vision and direction of an organization, making the final decisions over all of the corporation\'s operations. The highest-ranking management officer; often also the chairman of the board. Usually called CEO in the United States, chief executive or managing director in the United Kingdom, Commonwealth of Nations, and some other countries.'
    },
    {
        title: 'Chief experience officer',
        abbreviation: 'CXO',
        description:
            'Responsible for user experience, overseeing user experience design and user interface design. CXO is not to be confused with CxO, a term commonly used when referring to any one of various chief officers.'
    },
    {
        title: 'Chief financial officer',
        abbreviation: 'CFO',
        description: 'Responsible for all aspects of finances'
    },
    {
        title: 'Chief gaming officer',
        abbreviation: 'CGO',
        description:
            'Responsible for both the game development and the online and offline publishing functions of a company that makes video games'
    },
    {
        title: 'Chief government relations officer',
        abbreviation: 'CGRO',
        description:
            'Responsible for all aspects of government relations and lobbying'
    },
    {
        title: 'Chief human resources officer',
        abbreviation: 'CHRO',
        description:
            'Responsible for all aspects of human resource management and industrial relations'
    },
    {
        title: 'Chief information officer',
        abbreviation: 'CIO',
        description:
            'Responsible for IT, particularly in IT companies or companies that rely heavily on an IT infrastructure'
    },
    {
        title: 'Chief information security officer',
        abbreviation: 'CISO',
        description: 'Responsible for information security'
    },
    {
        title: 'Chief information technology officer',
        abbreviation: 'CITO',
        description:
            'Responsible for information technology. Often equivalent to chief information officer (CIO) and, in a company that sells IT, chief technology officer (CTO).'
    },
    {
        title: 'Chief innovation officer',
        abbreviation: 'CINO',
        description: 'Responsible for innovation'
    },
    {
        title: 'Chief investment officer',
        abbreviation: 'CIO',
        description:
            'Responsible for investment and for the asset liability management (ALM) of typical large financial institutions such as insurers, banks and/or pension funds'
    },
    {
        title: 'Chief knowledge officer',
        abbreviation: 'CKO',
        description:
            'Responsible for managing intellectual capital and knowledge management'
    },
    {
        title: 'Chief learning officer',
        abbreviation: 'CLO',
        description: 'Responsible for learning and training'
    },
    {
        title: 'Chief legal officer',
        abbreviation: 'CLO',
        description:
            'Responsible for overseeing and identifying legal issues in all departments and their interrelation, as well as corporate governance and business policy. Often called general counsel (GC) or chief counsel.'
    },
    {
        title: 'Chief marketing officer',
        abbreviation: 'CMO',
        description:
            'Responsible for marketing; job may include sales management, product development, distribution channel management, marketing communications (including advertising and promotions), pricing, market research, and customer service.'
    },
    {
        title: 'Chief medical officer',
        abbreviation: 'CMO',
        description:
            'Responsible for scientific and medical excellence, especially in pharmaceutical companies, health systems, hospitals, and integrated provider networks. The title is used in many countries for the senior government official who advises on matters of public health importance. In the latter sense compare also chief dental officer.'
    },
    {
        title: 'Chief networking officer',
        abbreviation: 'CNO',
        description:
            'Responsible for social capital within the company and between the company and its partners'
    },
    {
        title: 'Chief nursing officer',
        abbreviation: 'CNO',
        description: 'Responsible for nursing'
    },
    {
        title: 'Chief operating officer',
        abbreviation: 'COO',
        description:
            'Responsible for supervising office administration and maintenance, business operations, including operations management, operations research, and (when applicable) manufacturing operations; role is highly contingent and situational, changing from company to company and even from a CEO to their successor within the same company. Often called "director of operations" in the nonprofit sector.'
    },
    {
        title: 'Chief privacy officer',
        abbreviation: 'CPO',
        description:
            'Responsible for all the privacy of the data in an organization, including privacy policy enforcement'
    },
    {
        title: 'Chief process officer',
        abbreviation: 'CPO',
        description:
            'Responsible for business processes and applied process theory, defining rules, policies, and guidelines to ensure that the main objectives follow the company strategy as well as establishing control mechanisms'
    },
    {
        title: 'Chief procurement officer',
        abbreviation: 'CPO',
        description:
            'Responsible for procurement, sourcing goods and services and negotiating prices and contracts'
    },
    {
        title: 'Chief product officer',
        abbreviation: 'CPO',
        description:
            'Responsible for all product-related matters. The CPO is to the business\'s product what the CTO is to technology. The responsibilities of the CPO are inclusive of product vision, product strategy, user experience, product design, product development, and product marketing.'
    },
    {
        title: 'Chief quality officer',
        abbreviation: 'CQO',
        description:
            'Responsible for quality and quality assurance, setting up quality goals and ensuring that those goals continue to be met over time'
    },
    {
        title: 'Chief research officer',
        abbreviation: 'CRO',
        description: 'Responsible for research'
    },
    {
        title: 'Chief research and development officer',
        abbreviation: 'CRDO',
        description: 'Responsible for research and development'
    },
    {
        title: 'Chief revenue officer',
        abbreviation: 'CRO',
        description: 'Responsible for measuring and maximizing revenue'
    },
    {
        title: 'Chief risk officer',
        abbreviation: 'CRO',
        description:
            'Responsible for risk management, ensuring that risk is avoided, controlled, accepted, or transferred and that opportunities are not missed. Sometimes called chief risk management officer (CRMO).'
    },
    {
        title: 'Chief sales officer',
        abbreviation: 'CSO',
        description: 'Responsible for sales'
    },
    {
        title: 'Chief science officer',
        abbreviation: 'CSO',
        description:
            'Responsible for science, usually applied science, including research and development and new technologies. Sometimes called chief scientist.'
    },
    {
        title: 'Chief security officer',
        abbreviation: 'CSO',
        description:
            'Responsible for security, including physical security and network security'
    },
    {
        title: 'Chief software officer',
        abbreviation: 'CSO',
        description:
            'Responsible for the overall software strategy, roadmap, engineering, and user experience'
    },
    {
        title: 'Chief solutions officer',
        abbreviation: 'CSO',
        description:
            'Responsible for the development and delivery of reliable and innovative business and technology solutions'
    },
    {
        title: 'Chief strategy officer',
        abbreviation: 'CSO',
        description:
            'Responsible for all aspects of strategy and strategic planning, including enterprise portfolio management, corporate development, and market intelligence'
    },
    {
        title: 'Chief sustainability officer',
        abbreviation: 'CSO',
        description: 'Responsible for environmental/sustainability programs'
    },
    {
        title: 'Chief system engineer',
        abbreviation: 'CSE',
        description:
            'Responsible for the whole system specification, validation, and verification in development processes. Usually using as the manager of other sub-system engineers.'
    },
    {
        title: 'Chief technical officer',
        abbreviation: 'CTO',
        description:
            'Responsible to bridge the technical specific issues related to product or service in the organization. This position is common in NGOs and the development aid sector when the CEO or Project Director is not a person with a strong technical background related to the aid program focus such as economic development, renewable energy, human rights, agriculture, WASH, emergency responses, etc. The CTO provides guidance and advice to the program implementation team related to technical things. In some development aid programs, this position is similar to the Technical Director.'
    },
    {
        title: 'Chief technology officer',
        abbreviation: 'CTO',
        description:
            'Responsible for technology and research and development, overseeing the development of technology to be commercialized. (For an information technology company, the subject matter would be similar to the CIO\'s; however, the CTO\'s focus is technology for the firm to sell versus technology used for facilitating the firm\'s own operations.). Sometimes called chief technical officer.'
    },
    {
        title: 'Chief value officer',
        abbreviation: 'CVO',
        description:
            'Ensure that all programs, actions, new products, services and investments create and capture customer value.'
    },
    {
        title: 'Chief visionary officer',
        abbreviation: 'CVO',
        description:
            'Responsible for defining corporate vision, business strategy, and working plans'
    },
    {
        title: 'Chief web officer',
        abbreviation: 'CWO',
        description:
            'Responsible for the web presence of the company and usually for the entire online presence, including intranet and Internet (web, mobile apps, other)'
    },
    {
        title: 'President',
        description:
            'Some organizations designate a president instead of a CEO. While many of the responsibilities are the same between these two roles, a president may take on additional tasks that a CEO may not. They could perform some of the tasks that a COO and a CFO are in charge of in larger businesses. As a company grows, though, the president\'s role may encompass more defined tasks—like handling top-level decisions and directing their management teams—rather than a broad range of executive functions.'
    },
    {
        title: 'Vice president',
        description:
            'The vice president initiates the president\'s decisions and plans by directing mid-level managers and team leaders. They can act in an operational role, overseeing business operations and initiating organizational structures among the other roles.'
    },
    {
        title: 'Executive assistant',
        description:
            'An executive assistant usually reports directly to the CEO and handles much of the CEO\'s administrative tasks. A business often relies on an executive assistant to organize and maintain the CEO\'s schedules, agendas and appointments.'
    },
    {
        title: 'Marketing manager',
        description:
            'A marketing manager oversees the entire marketing department, depending on the size of the company. In large corporations, there can be multiple teams within the marketing department, each with its own marketing manager. Each manager reports directly to the CMO. In smaller businesses, the marketing manager may be the only top-level business role in charge of directing marketing efforts.'
    },
    {
        title: 'Product manager',
        description:
            'Product managers analyze product markets and streamline processes related to product development. A product manager may focus their efforts on researching customer markets, evaluating in-demand products, assessing manufacturing processes for making products, analyzing competitor products and collaborating with marketing teams to develop strategies for promoting products.'
    },
    {
        title: 'Project manager',
        description:
            'Project managers oversee many of the planning and development processes for business projects. These professionals initiate, design, monitor, control and finalize projects. This business role may have the added responsibility of analyzing and mitigating risks to various projects, and they commonly work with other department managers—such as marketing and product managers—to plan and develop each aspect of a project, including budget, resources and timelines.'
    },
    {
        title: 'Finance manager',
        description:
            'Finance managers usually analyze costs and revenue and use this data to prepare financial reports. In smaller organizations, this business role may oversee several financial aspects of business operations, such as calculating and projecting incoming revenue and company expenses. In larger businesses, the finance manager may be responsible for managing staff accountants and bookkeepers, and they rely on the work of these professionals to create accurate financial reports and forecasts.'
    },
    {
        title: 'Human resources manager',
        description:
            'Human resources managers direct the human resources department. They oversee large teams within the human resources department, or in smaller organizations, they may be in charge of only a few staff members. This business role is crucial for operations because they recruit, interview, hire and onboard employees. HR managers commonly consult with top-level executives to initiate strategic plans and act as a liaison between upper-level management and company staff.'
    },
    {
        title: 'Marketing specialist',
        description:
            'A key role in the marketing department is the marketing specialist. Specialists perform several functions, such as gathering customer data, researching target demographics and optimizing content for SEO purposes. Many organizations have more than one marketing specialist working in the department, and this role typically reports directly to the marketing manager.'
    },
    {
        title: 'Business analyst',
        description:
            'Many companies employ business analysts who are responsible for evaluating the growth and development of the business. This role analyzes market trends, projects future revenue and develops plans that help businesses track profitability, product viability and the overall success of operations.'
    },
    {
        title: 'Human resource personnel',
        description:
            'Human resources personnel are an essential component of any business and HR staff work under the supervision of the HR manager. The staff in these business roles commonly handle payroll tasks, employee schedules and performance reviews and evaluations. In large companies, the HR department can consist of several HR managers and many staff members under their direction.'
    },
    {
        title: 'Accountant',
        description:
            'An accountant oversees the day-to-day transactions of companies, including sales transactions, expense payments and tax reporting. Accountants in smaller organizations may have responsibilities that finance managers or CFOs handle in large business environments.'
    },
    {
        title: 'Sales representative',
        description:
            'Sales representatives connect with customers to sell their business\' products or services. Successful sales teams use effective communication and interpersonal skills to build relationships with and maintain loyalty among their company\'s customers, which directly influences the revenue stream of the business.'
    },
    {
        title: 'Customer service representative',
        description:
            'Customer service representatives help customers solve problems, handle product returns and refunds and resolve issues when customers are unsatisfied. These operational roles are essential for building a reputation for their company and fostering long-lasting customer relationships.'
    },
    {
        title: 'Administrative assistant',
        description:
            'The administrative assistant, office assistant or receptionist serves as the first point of contact for visitors and clients entering the business. They may perform many essential tasks such as managing the phone lines, communicating between clients and business partners and keeping staff schedules organized. They may even have tasks like data entry to help keep company documents current and accurate.'
    }
];

// https://jsonplaceholder.typicode.com/
const users = [
    {
        id: 1,
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        phone: '1-770-736-8031 x56442'
    },
    {
        id: 2,
        name: 'Ervin Howell',
        username: 'Antonette',
        email: 'Shanna@melissa.tv',
        phone: '010-692-6593 x09125'
    },
    {
        id: 3,
        name: 'Clementine Bauch',
        username: 'Samantha',
        email: 'Nathan@yesenia.net',
        phone: '1-463-123-4447'
    },
    {
        id: 4,
        name: 'Patricia Lebsack',
        username: 'Karianne',
        email: 'Julianne.OConner@kory.org',
        phone: '493-170-9623 x156'
    },
    {
        id: 5,
        name: 'Chelsey Dietrich',
        username: 'Kamren',
        email: 'Lucio_Hettinger@annie.ca',
        phone: '(254)954-1289'
    },
    {
        id: 6,
        name: 'Mrs. Dennis Schulist',
        username: 'Leopoldo_Corkery',
        email: 'Karley_Dach@jasper.info',
        phone: '1-477-935-8478 x6430'
    },
    {
        id: 7,
        name: 'Kurtis Weissnat',
        username: 'Elwyn.Skiles',
        email: 'Telly.Hoeger@billy.biz',
        phone: '210.067.6132'
    },
    {
        id: 8,
        name: 'Nicholas Runolfsdottir V',
        username: 'Maxime_Nienow',
        email: 'Sherwood@rosamond.me',
        phone: '586.493.6943 x140'
    },
    {
        id: 9,
        name: 'Glenna Reichert',
        username: 'Delphine',
        email: 'Chaim_McDermott@dana.io',
        phone: '(775)976-6794 x41206'
    },
    {
        id: 10,
        name: 'Clementina DuBuque',
        username: 'Moriah.Stanton',
        email: 'Rey.Padberg@karina.biz',
        phone: '024-648-3804'
    }
];

setTheme('material');

// Create Canvas
// -------------

const graph = new dia.Graph();

const paper = new dia.Paper({
    model: graph,
    interactive: false,
    async: true,
    frozen: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: 'transparent' },
    defaultConnectionPoint: { name: 'boundary' },
    clickThreshold: 10,
    defaultLink: () => makeLink()
});

const scroller = new ui.PaperScroller({
    paper,
    baseWidth: 1,
    baseHeight: 1,
    contentOptions: {
        useModelGeometry: true,
        allowNewOrigin: 'any',
        padding: 20
    }
});

document.getElementById('canvas').append(scroller.el);
scroller.render();

paper.on('paper:pinch', (evt, ox, oy, scale) => {
    evt.preventDefault();
    ui.Popup.close();
    scroller.zoom((scale - 1) * 2, { min: 0.2, max: 5, ox, oy });
});

paper.on('paper:pan', (evt, tx, ty) => {
    evt.preventDefault();
    scroller.el.scrollLeft += tx;
    scroller.el.scrollTop += ty;
});

paper.on('blank:pointerdown', (evt) => {
    scroller.startPanning(evt);
});

paper.on('element:pointerclick', (elementView) => {
    const { el, model } = elementView;
    const data = model.get('data');
    if (!data) return;
    const popup = new ui.Popup({
        target: el,
        root: paper.el,
        padding: 8,
        position: 'bottom',
        anchor: 'top',
        scale: scroller.zoom(),
        content: /*html*/ `
            <table>
                <caption>${model.attr('label/text')}</caption>
                ${Object.entries(data)
        .map(([key, value]) => {
            return /*html*/ `
                        <tr>
                            <td>${key}</td>
                            <td>${value}</td>
                        </tr>
                    `;
        })
        .join('')}
            </table>
        `
    });
    popup.render();
});

// Create Minimap
// --------------

const navigator = new ui.Navigator({
    el: document.getElementById('minimap'),
    paperScroller: scroller,
    paperOptions: {
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        elementView: dia.ElementView.extend({
            body: null,

            markup: [
                {
                    tagName: 'rect',
                    selector: 'body'
                }
            ],

            initFlag: ['RENDER', 'UPDATE', 'TRANSFORM'],

            presentationAttributes: {
                size: ['UPDATE'],
                position: ['TRANSFORM'],
                angle: ['TRANSFORM']
            },

            confirmUpdate: function(flags) {
                if (this.hasFlag(flags, 'RENDER')) this.render();
                if (this.hasFlag(flags, 'UPDATE')) this.update();
                if (this.hasFlag(flags, 'TRANSFORM')) this.updateTransformation();
            },

            render: function() {
                const { markup, el, model } = this;
                const doc = util.parseDOMJSON(markup);
                this.body = doc.selectors.body;
                this.body.setAttribute('fill', model.get('navigatorColor'));
                el.appendChild(doc.fragment);
            },

            update: function() {
                const { model, body } = this;
                const size = model.size();
                body.setAttribute('width', size.width);
                body.setAttribute('height', size.height);
            }
        })
    }
});

navigator.render();

// Create Role Stencil
// -------------------

const roleStencil = new ui.Stencil({
    el: document.getElementById('role-stencil'),
    paper,
    scaleClones: true,
    height: null,
    search: { '*': ['data/title', 'data/abbreviation'] },
    layout: {
        columns: 1,
        resizeToFit: false,
        rowHeight: 'auto',
        rowGap: 5,
        marginX: 5,
        marginY: 5,
        centre: false,
        dx: 0,
        dy: 0
    }
});

roleStencil.on({
    'element:dragstart': (cloneView, evt) => {
        const element = cloneView.model.clone();
        evt.data.elements = [element];
    },
    'element:drag': (cloneView, evt, cloneArea, validDropTarget) => {
        const { elements, dragStarted } = evt.data;
        const { x, y } = cloneArea.center();
        if (validDropTarget) {
            if (!dragStarted) {
                treeView.dragstart(elements, x, y);
                evt.data.dragStarted = true;
            }
            treeView.drag(elements, x, y);
            cloneView.el.style.display = 'none';
        } else {
            treeView.cancelDrag();
            evt.data.dragStarted = false;
            cloneView.el.style.display = 'block';
        }
    },
    'element:dragend': (cloneView, evt, cloneArea, validDropTarget) => {
        const { elements } = evt.data;
        const { x, y } = cloneArea.center();
        const canDrop = validDropTarget && treeView.canDrop();
        treeView.dragend(elements, x, y);
        cloneView.el.style.display = 'block'; // enable drop animation
        roleStencil.cancelDrag({ dropAnimation: !canDrop });
        const [element] = elements;
        if (graph.getCell(element)) {
            elements[0].findView(paper).addTools(
                new dia.ToolsView({
                    tools: [
                        new elementTools.Remove({
                            y: 10,
                            x: 'calc(w -10)',
                            action: () => {
                                const siblingRank = element.get('siblingRank');
                                const [parent] = graph.getNeighbors(element, { inbound: true });
                                const connectedLinks = graph.getConnectedLinks(element, {
                                    outbound: true
                                });
                                connectedLinks.forEach((link) => {
                                    const child = link.getTargetCell();
                                    link.source(parent);
                                    child.set(
                                        'siblingRank',
                                        siblingRank +
                                        g.scale.linear(
                                            [0, connectedLinks.length],
                                            [0, 1],
                                            child.get('siblingRank')
                                        )
                                    );
                                });
                                element.remove();
                            }
                        })
                    ]
                })
            );
        }
    }
});

roleStencil.render();
roleStencil.el.querySelector('.search').placeholder = 'Search Role';
roleStencil.el.dataset.textNoMatchesFound = 'No role found!';
roleStencil.load(roles.map((role, index) => makeRole(role, index + 1)));

// Create User Stencil
// -------------------

const userStencil = new ui.Stencil({
    el: document.getElementById('user-stencil'),
    paper,
    scaleClones: true,
    height: null,
    search: { '*': ['data/name', 'data/username'] },
    layout: {
        columns: 1,
        resizeToFit: false,
        rowHeight: 'auto',
        rowGap: 5,
        marginX: 5,
        marginY: 5,
        centre: false,
        dx: 0,
        dy: 0
    }
});

let outline = null;

userStencil.on('element:drag', (cloneView, evt, bbox) => {
    if (outline) {
        outline.remove();
        outline = null;
    }
    const [el] = graph.findModelsInArea(bbox);
    const valid = el && el.get('roleId');
    if (valid) {
        cloneView.el.classList.remove('invalid-drop');
        outline = highlighters.stroke.add(el.findView(paper), 'body', 'outline', {
            padding: 8,
            attrs: {
                stroke: '#4a7bcb',
                'stroke-width': 4,
                'stroke-linecap': 'butt',
                'stroke-linejoin': 'miter'
            }
        });
    } else {
        cloneView.el.classList.add('invalid-drop');
    }
});

userStencil.on('element:dragend', (cloneView, evt, bbox) => {
    const [el] = graph.findModelsInArea(bbox);
    const valid = el && el.get('roleId');
    userStencil.cancelDrag({ dropAnimation: !valid });
    if (valid) {
        const { model } = cloneView;
        const user = cloneView.model.clone();
        user.set('z', 2);
        graph.addCell(user);
        el.embed(user);
        runLayout();
        userGraph.getCell(model.get('userId')).remove();
        userStencil.layoutGroup(userGraph);
        // Add some tools to the newly dropped element
        user.findView(paper).addTools(
            new dia.ToolsView({
                tools: [
                    new elementTools.Remove({
                        y: 10,
                        x: 'calc(w -10)'
                    })
                ]
            })
        );

        if (outline) {
            outline.remove();
            outline = null;
        }
    }
});

userStencil.render();
userStencil.el.querySelector('.search').placeholder = 'Search User';
userStencil.el.dataset.textNoMatchesFound = 'No user found!';
userStencil.load(users.map((user, index) => makeUser(user, index + 1)));

const userGraph = userStencil.getGraph();

// Return the element to the stencil after removal
graph.on('remove', (cell) => {
    if (cell.isLink()) return;
    const { userId, data } = cell.attributes;
    if (userId) {
        userGraph.addCell(makeUser(data, userId));
        userStencil.layoutGroup(userGraph);
    }
    runLayout();
});

// Create Tree Layout and View
// ---------------------------

const tree = new layout.TreeLayout({
    graph,
    verticalGap: 40,
    horizontalGap: 40,
    direction: 'B',
    filter: (children) => {
        return children.filter((child) => !child.isEmbedded());
    },
    updatePosition: (el, position) => {
        el.position(position.x, position.y, { deep: true });
    }
});

const treeView = new ui.TreeLayoutView({
    paper: paper,
    model: tree,
    validatePosition: function(el, x, y) {
        return false;
    },
    canInteract: function(elementView) {
        return !graph.isSource(elementView.model);
    },
    reconnectElements: (
        [element],
        target,
        siblingRank,
        direction,
        treeLayoutView
    ) => {
        treeLayoutView.reconnectElement(element, {
            id: target.id,
            siblingRank,
            direction
        });
        runLayout();
    }
});

// Layout and Render the Cells
// ---------------------------

const hierarchy = new shapes.standard.Ellipse({
    size: { width: 150, height: 150 },
    navigatorColor: '#4a7bcb',
    attrs: {
        root: {
            style: { cursor: 'default' }
        },
        body: {
            stroke: '#4a7bcb',
            strokeDasharray: '6,2',
            fill: '#C9D4EB'
        },
        label: {
            fontSize: 20,
            text: 'Roles\nHierarchy',
            fill: '#4a7bcb'
        }
    }
});

hierarchy.addTo(graph);
scroller.positionPoint(hierarchy.getBBox().topMiddle(), '50%', 10);
runLayout();
paper.unfreeze();

// Utils
// -----

function makeLink(parentElementLabel, childElementLabel) {
    return new shapes.standard.Link({
        source: { id: parentElementLabel },
        target: { id: childElementLabel },
        connector: { name: 'rounded' },
        z: -1,
        attrs: {
            line: {
                strokeWidth: 2,
                targetMarker: null
            }
        }
    });
}

function makeRole(role, id) {
    const color = '#4b586c';
    let text = role.title;
    if ('abbreviation' in role) text += ` (${role.abbreviation})`;
    return new shapes.standard.Rectangle({
        roleId: id,
        size: { width: 200, height: 40 },
        data: role,
        navigatorColor: '#a39c8f',
        attrs: {
            body: {
                stroke: color,
                fill: '#FFFFFF',
                rx: 5,
                ry: 5
            },
            label: {
                fill: color,
                refY: null,
                y: 6,
                textVerticalAnchor: 'top',
                fontSize: 13,
                fontFamily: 'sans-serif',
                lineHeight: 15,
                text,
                textWrap: {
                    maxLineCount: 2,
                    width: 'calc(w-20)'
                }
            }
        }
    });
}

function makeUser(user, id) {
    const color = '#655a48';
    return new shapes.standard.Rectangle({
        id,
        userId: id,
        z: id,
        size: { width: 190, height: 40 },
        data: user,
        navigatorColor: '#4b586c',
        attrs: {
            body: {
                stroke: color,
                fill: '#EFEEED',
                rx: 5,
                ry: 5
            },
            label: {
                fill: color,
                fontSize: 13,
                fontFamily: 'sans-serif',
                text: user.name
            }
        }
    });
}

function runLayout() {
    graph.getElements().forEach((el) => {
        if (el.get('roleId')) {
            const roleUsers = el.getEmbeddedCells();
            if (roleUsers.length > 0) {
                layout.GridLayout.layout(roleUsers, {
                    rowGap: 5
                });
                el.fitEmbeds({ padding: { top: 40, horizontal: 5, bottom: 5 }});
            } else {
                el.resize(200, 40);
            }
            el.set('z', 1);
        } else if (el.get('userId')) {
            el.set('z', 2);
        }
    });
    tree.layout();
    paper.fitToContent({
        allowNewOrigin: 'any',
        contentArea: tree.getLayoutBBox(),
        padding: 200
    });
}
