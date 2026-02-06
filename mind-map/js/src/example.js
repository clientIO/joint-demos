import { IDEA_USER_COLORS } from './theme';

const example = {
    label: 'Business Plan\nwww.example.com\n\n2022',
    annotations: [
        {
            'url': 'www.example.com',
            'attrs': {
                'fill': '#4666E5',
                'cursor': 'pointer',
                'text-decoration': 'underline',
                'event': 'element:url:pointerdown',
                'data-url': 'www.example.com'
            },
            'start': 14,
            'end': 29
        }
    ],
    image: 'assets/plan.svg',
    children: [
        {
            label: 'Product',
            userColor: IDEA_USER_COLORS[0],
            image: 'assets/product.svg',
            direction: 'R',
            children: [
                { label: 'Customer Service' },
                { label: 'Development' },
            ],
        },
        {
            label: 'Sales',
            userColor: IDEA_USER_COLORS[1],
            image: 'assets/sales.svg',
            direction: 'R',
            children: [
                { label: 'Tracking' },
                { label: 'Inventory' },
            ],
        },
        {
            label: 'Administration',
            userColor: IDEA_USER_COLORS[2],
            image: 'assets/administration.svg',
            direction: 'L',
            children: [
                { label: 'HR' },
                { label: 'Recruitment' },
                { label: 'Management' },
            ],
        },
        {
            label: 'Finance',
            userColor: IDEA_USER_COLORS[1],
            image: 'assets/finance.svg',
            direction: 'L',
            children: [
                { label: 'Investment' },
                { label: 'Payroll' },
                { label: 'Shares' },
            ],
        },
        {
            label: 'Marketing',
            userColor: IDEA_USER_COLORS[2],
            image: 'assets/marketing.svg',
            direction: 'R',
            children: [
                { label: 'SEO' },
                { label: 'Blog / Website' },
                { label: 'Social Media' },
                { label: 'Press Release' },
            ],
        }
    ],
};

export default example;
