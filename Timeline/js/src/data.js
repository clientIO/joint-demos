import { util } from '@joint/plus';
import { Milestone, Category, Event } from './shapes';
import { makeLink } from './utils';

const artificialIntelligenceTimelineData = {
    milestones: [
        {
            id: '2015',
            children: [
                {
                    id: '2015-company-formation',
                    label: 'Company Formation',
                    direction: 'T',
                    children: [
                        {
                            id: '2015-company-formation-openai',
                            direction: 'T',
                            date: 'December 11',
                            label: 'OpenAI officially launched as non-profit AI research organization'
                        },
                        {
                            id: '2015-company-formation-openai-founders',
                            direction: 'T',
                            date: 'December 11',
                            label: 'Founders include Elon Musk, Sam Altman, Greg Brockman, Ilya Sutskever'
                        },
                        {
                            id: '2015-company-formation-openai-funding',
                            direction: 'T',
                            date: 'December 11',
                            label: '$1 billion commitment announced'
                        }
                    ]
                }
            ]
        },
        {
            id: '2016',
            children: [
                {
                    id: '2016-openai-team-building',
                    label: 'Team Building',
                    direction: 'T',
                    children: [
                        {
                            id: '2016-openai-team-building-ilya-sutskever',
                            direction: 'T',
                            date: 'January 1',
                            label: 'Ilya Sutskever joins as Research Director'
                        },
                        {
                            id: '2016-openai-team-building-ian-goodfellow',
                            direction: 'T',
                            date: 'March 31',
                            label: 'Ian Goodfellow joins from Google'
                        },
                        {
                            id: '2016-openai-team-building-pieter-abbeel',
                            direction: 'T',
                            date: 'April 26',
                            label: 'Pieter Abbeel joins for robotics research'
                        }
                    ]
                },
                {
                    id: '2016-openai-product-release',
                    label: 'Product Release',
                    direction: 'T',
                    children: [
                        {
                            id: '2016-openai-product-release-openai-gym',
                            direction: 'T',
                            date: 'April 27',
                            label: 'OpenAI Gym launched for reinforcement learning'
                        },
                        {
                            id: '2016-openai-normalization-technique',
                            direction: 'T',
                            date: 'February 25',
                            label: 'Weight normalization technique for neural networks introduced'
                        }
                    ]
                }
            ]
        },
        {
            id: '2017',
            children: [
                {
                    id: '2017-openai-research-advances',
                    label: 'Research Advances',
                    direction: 'T',
                    children: [
                        {
                            id: '2017-openai-research-advances-evolution-strategies',
                            direction: 'T',
                            date: 'March 16',
                            label: 'Evolution Strategies as alternative to reinforcement learning'
                        },
                        {
                            id: '2017-openai-research-advances-robotics',
                            direction: 'T',
                            date: 'May 16',
                            label: 'One-shot imitation learning for robotics'
                        }
                    ]
                },
                {
                    id: '2017-openai-infrastructure',
                    label: 'Infrastructure',
                    direction: 'T',
                    children: [
                        {
                            id: '2017-openai-infrastructure-dota2',
                            direction: 'T',
                            date: 'August 11',
                            label: 'OpenAI Five beats Dota 2 professionals'
                        }
                    ]
                }
            ]
        },
        {
            id: '2018',
            children: [
                {
                    id: '2018-openai-model-releases',
                    label: 'Model Releases',
                    direction: 'T',
                    children: [
                        {
                            id: '2018-openai-model-releases-gpt-1',
                            direction: 'T',
                            date: 'June 11',
                            label: 'GPT-1 released with 117M parameters'
                        },
                        {
                            id: '2018-openai-model-releases-dactyl',
                            direction: 'T',
                            date: 'July 30',
                            label: 'Dactyl robot hand with unprecedented dexterity'
                        }
                    ]
                },
                {
                    id: '2018-openai-organizational',
                    label: 'Organizational',
                    direction: 'T',
                    children: [
                        {
                            id: '2018-openai-organizational-charter',
                            direction: 'T',
                            date: 'April 9',
                            label: 'OpenAI Charter published'
                        }
                    ]
                }
            ]
        },
        {
            id: '2019',
            children: [
                {
                    id: '2019-openai-organizational-restructuring',
                    direction: 'T',
                    label: 'Org. Restructuring',
                    children: [
                        {
                            id: '2019-openai-organizational-restructuring-openai-lp',
                            direction: 'T',
                            date: 'March 1',
                            label: 'Transitions to capped-profit model (OpenAI LP)'
                        },
                        {
                            id: '2019-openai-organizational-restructuring-microsoft-investment',
                            direction: 'T',
                            date: 'July 22',
                            label: 'Microsoft invests $1 billion'
                        }
                    ]
                },
                {
                    id: '2019-openai-model-advances',
                    direction: 'T',
                    label: 'Model Advancement',
                    children: [
                        {
                            id: '2019-openai-model-advances-gpt-2',
                            direction: 'T',
                            date: 'February 14',
                            label: 'GPT-2 released with 1.5B parameters'
                        },
                        {
                            id: '2019-openai-model-advances-gpt-2-staged-rollout',
                            direction: 'T',
                            date: 'February',
                            label: 'Staged rollout due to misuse concerns'
                        }
                    ]
                },
                {
                    id: '2019-anthropic-foundation-formation',
                    label: 'Early AI Safety Work',
                    direction: 'B',
                    children: [
                        {
                            id: '2019-anthropic-ai-safety-research',
                            direction: 'B',
                            date: 'October 1',
                            label: 'Future Anthropic founders working on AI safety research at OpenAI'
                        },
                        {
                            id: '2019-anthropic-foundation-formation-ai-safety-alignment',
                            direction: 'B',
                            date: 'December 1',
                            label: 'Developing new approaches to AI safety and alignment'
                        }
                    ]
                }
            ]
        },
        {
            id: '2020',
            children: [
                {
                    id: '2020-openai-model-releases',
                    label: 'Major Model Release',
                    direction: 'T',
                    children: [
                        {
                            id: '2020-openai-model-releases-gpt-3',
                            direction: 'T',
                            date: 'June 11',
                            label: 'GPT-3 released with 175B parameters'
                        },
                        {
                            id: '2020-openai-api',
                            direction: 'T',
                            date: 'June 11',
                            label: 'OpenAI API launched, giving access to GPT-3'
                        },
                        {
                            id: '2020-openai-licenses-gpt-3',
                            direction: 'T',
                            date: 'September 22',
                            label: 'Microsoft exclusively licenses GPT-3 technology'
                        }
                    ]
                },
                {
                    id: '2020-anthropic-planning',
                    label: 'Company Planning',
                    direction: 'B',
                    children: [
                        {
                            id: '2020-anthropic-amodei-departure',
                            direction: 'B',
                            date: 'May 1',
                            label: 'Dario Amodei leaves position as VP of Research at OpenAI'
                        },
                        {
                            id: '2020-anthropic-team-formation',
                            direction: 'B',
                            date: 'July 1',
                            label: 'Dario and Daniela Amodei recruit founding team members'
                        },
                        {
                            id: '2020-anthropic-initial-investment',
                            direction: 'B',
                            date: 'October 1',
                            label: 'Secures initial funding commitments for launch'
                        }
                    ]
                }
            ]
        },
        {
            id: '2021',
            children: [
                {
                    id: '2021-openai-product-releases',
                    label: 'New Products',
                    direction: 'T',
                    children: [
                        {
                            id: '2021-openai-product-releases-dall-e',
                            direction: 'T',
                            date: 'January 5',
                            label: 'DALL-E unveiled, generating images from text descriptions'
                        },
                        {
                            id: '2021-openai-product-releases-codex',
                            direction: 'T',
                            date: 'August 10',
                            label: 'Codex released, powering GitHub Copilot'
                        },
                        {
                            id: '2021-openai-product-releases-clip',
                            direction: 'T',
                            date: 'January 5',
                            label: 'CLIP model connects text and images in neural networks'
                        }
                    ]
                },
                {
                    id: '2021-anthropic-launch',
                    label: 'Official Launch',
                    direction: 'B',
                    children: [
                        {
                            id: '2021-anthropic-launch-founded',
                            direction: 'B',
                            date: 'January 21',
                            label: 'Anthropic founded by Dario Amodei and team from OpenAI'
                        },
                        {
                            id: '2021-anthropic-launch-funding',
                            direction: 'B',
                            date: 'May 18',
                            label: 'Raises $124 million in initial funding'
                        },
                        {
                            id: '2021-anthropic-hf-safety',
                            direction: 'B',
                            date: 'October',
                            label: 'Publishes research on AI harmlessness from human feedback'
                        }
                    ]
                }
            ]
        },
        {
            id: '2022',
            children: [
                {
                    id: '2022-openai-dall-e-2',
                    label: 'DALL-E 2',
                    direction: 'T',
                    children: [
                        {
                            id: '2022-openai-dall-e-2-release',
                            direction: 'T',
                            date: 'April 6',
                            label: 'DALL-E 2 released with improved image generation'
                        },
                        {
                            id: '2022-openai-dall-e-2-public',
                            direction: 'T',
                            date: 'July 20',
                            label: 'DALL-E 2 opens to public beta'
                        }
                    ]
                },
                {
                    id: '2022-openai-chatgpt',
                    label: 'ChatGPT Launch',
                    direction: 'T',
                    children: [
                        {
                            id: '2022-openai-chatgpt-release',
                            direction: 'T',
                            date: 'November 30',
                            label: 'ChatGPT launched as free research preview'
                        },
                        {
                            id: '2022-openai-chatgpt-users',
                            direction: 'T',
                            date: 'December',
                            label: 'Reaches 1 million users in 5 days'
                        },
                        {
                            id: '2022-openai-dall-e-api',
                            direction: 'T',
                            date: 'November 3',
                            label: 'DALL-E API made available to developers'
                        }
                    ]
                },
                {
                    id: '2022-anthropic-research',
                    label: 'Research Advancement',
                    direction: 'B',
                    children: [
                        {
                            id: '2022-anthropic-research-claude',
                            direction: 'B',
                            date: 'July 15',
                            label: 'Initial development of Claude assistant'
                        },
                        {
                            id: '2022-anthropic-research-funding',
                            direction: 'B',
                            date: 'April',
                            label: 'Secures $580 million Series B funding'
                        },
                        {
                            id: '2022-anthropic-constitutional-ai',
                            direction: 'B',
                            date: 'December 15',
                            label: 'Publishes Constitutional AI approach paper'
                        }
                    ]
                }
            ]
        },
        {
            id: '2023',
            children: [
                {
                    id: '2023-openai-gpt4',
                    label: 'GPT-4 Release',
                    direction: 'T',
                    children: [
                        {
                            id: '2023-openai-gpt4-launch',
                            direction: 'T',
                            date: 'March 14',
                            label: 'GPT-4 released with multimodal capabilities'
                        },
                        {
                            id: '2023-openai-chatgpt-plus',
                            direction: 'T',
                            date: 'February 1',
                            label: 'ChatGPT Plus subscription service launched at $20/month'
                        },
                        {
                            id: '2023-openai-dall-e-3',
                            direction: 'T',
                            date: 'October 11',
                            label: 'DALL-E 3 released with improved prompt following'
                        },
                        {
                            id: '2023-openai-gpt4-turbo',
                            direction: 'T',
                            date: 'November 6',
                            label: 'GPT-4 Turbo introduced at Dev Day with 128K context'
                        }
                    ]
                },
                {
                    id: '2023-openai-turmoil',
                    label: 'Leadership Crisis',
                    direction: 'T',
                    children: [
                        {
                            id: '2023-openai-turmoil-sam-altman',
                            direction: 'T',
                            date: 'November 17',
                            label: 'Sam Altman fired as CEO by board'
                        },
                        {
                            id: '2023-openai-turmoil-rehire',
                            direction: 'T',
                            date: 'November 22',
                            label: 'Sam Altman reinstated with new board'
                        }
                    ]
                },
                {
                    id: '2023-anthropic-claude',
                    label: 'Claude Launch',
                    direction: 'B',
                    children: [
                        {
                            id: '2023-anthropic-claude-release',
                            direction: 'B',
                            date: 'March 14',
                            label: 'Claude AI assistant publicly released'
                        },
                        {
                            id: '2023-anthropic-claude-2',
                            direction: 'B',
                            date: 'July 11',
                            label: 'Claude 2 released with improved capabilities'
                        },
                        {
                            id: '2023-anthropic-amazon-investment',
                            direction: 'B',
                            date: 'September 25',
                            label: 'Amazon invests up to $4 billion in Anthropic'
                        },
                        {
                            id: '2023-anthropic-claude-2.1',
                            direction: 'B',
                            date: 'December 4',
                            label: 'Claude 2.1 released with improved reasoning'
                        }
                    ]
                }
            ]
        },
        {
            id: '2024',
            children: [
                {
                    id: '2024-openai-gpt4o',
                    label: 'GPT-4o Launch',
                    direction: 'T',
                    children: [
                        {
                            id: '2024-openai-sora',
                            direction: 'T',
                            date: 'February 15',
                            label: 'Sora text-to-video model announced'
                        },
                        {
                            id: '2024-openai-gpt4o-release',
                            direction: 'T',
                            date: 'May 13',
                            label: 'GPT-4o released with faster speeds at lower cost'
                        },
                        {
                            id: '2024-openai-voice-mode',
                            direction: 'T',
                            date: 'May 13',
                            label: 'Voice mode made available to all users'
                        },
                        {
                            id: '2024-openai-custom-gpts',
                            direction: 'T',
                            date: 'January 10',
                            label: 'Custom GPTs available to all ChatGPT Plus users'
                        }
                    ]
                },
                {
                    id: '2024-openai-funding',
                    label: 'Major Funding',
                    direction: 'T',
                    children: [
                        {
                            id: '2024-openai-funding-valuation',
                            direction: 'T',
                            date: 'April 15',
                            label: 'Valued at $80 billion in new funding round'
                        },
                        {
                            id: '2024-openai-nvidia-partnership',
                            direction: 'T',
                            date: 'February 23',
                            label: 'Partners with Nvidia on supercomputing infrastructure'
                        }
                    ]
                },
                {
                    id: '2024-anthropic-claude3',
                    label: 'Claude 3 Family',
                    direction: 'B',
                    children: [
                        {
                            id: '2024-anthropic-200k-context',
                            direction: 'B',
                            date: 'January 30',
                            label: 'Introduces 200K token context window'
                        },
                        {
                            id: '2024-anthropic-claude3-release',
                            direction: 'B',
                            date: 'March 4',
                            label: 'Claude 3 family (Haiku, Sonnet, Opus) released'
                        },
                        {
                            id: '2024-anthropic-claude3-opus',
                            direction: 'B',
                            date: 'March 4',
                            label: 'Claude 3 Opus surpasses GPT-4 on several benchmarks'
                        },
                        {
                            id: '2024-anthropic-cai',
                            direction: 'B',
                            date: 'June 18',
                            label: 'Claude Anthropic Interface (CAI) announced'
                        }
                    ]
                },
                {
                    id: '2024-anthropic-business',
                    label: 'Business Growth',
                    direction: 'B',
                    children: [
                        {
                            id: '2024-anthropic-business-api',
                            direction: 'B',
                            date: 'January 24',
                            label: 'Launches improved API access for developers'
                        },
                        {
                            id: '2024-anthropic-business-expansion',
                            direction: 'B',
                            date: 'May 15',
                            label: 'Expands global presence with offices in London and Toronto'
                        }
                    ]
                }
            ]
        },
        {
            id: '2025',
            children: [
                {
                    id: '2025-openai-gpt5',
                    label: 'Next-Gen Models',
                    direction: 'T',
                    children: [
                        {
                            id: '2025-openai-gpt5-prediction',
                            direction: 'T',
                            date: 'Q2 (Predicted)',
                            label: 'Expected release of GPT-5 with advanced reasoning'
                        },
                        {
                            id: '2025-openai-robotics',
                            direction: 'T',
                            date: 'Q3 (Predicted)',
                            label: 'Projected expansion into robotics technology'
                        }
                    ]
                },
                {
                    id: '2025-anthropic-claude4',
                    label: 'Future Roadmap',
                    direction: 'B',
                    children: [
                        {
                            id: '2025-anthropic-claude4-prediction',
                            direction: 'B',
                            date: 'Q1 (Predicted)',
                            label: 'Projected release of Claude 4 model family'
                        },
                        {
                            id: '2025-anthropic-specialized-models',
                            direction: 'B',
                            date: 'Q3 (Predicted)',
                            label: 'Expected launch of domain-specific AI models'
                        }
                    ]
                }
            ]
        }
    ]
};

// Data class

class Timeline {
    milestones;
    
    constructor(timelineData) {
        this.milestones = timelineData.milestones;
    }
    
    getBusElements() {
        return this.milestones.map(milestone => milestone.id);
    }
    
    unshiftBusElement() {
        const prevYear = Number(this.milestones[0].id) - 1;
        
        this.milestones.unshift({
            id: prevYear.toString(),
            children: []
        });
        
        // Return new id
        return prevYear.toString();
    }
    
    addBusElementAfter(year) {
        const nextYear = Number(year) + 1;
        
        this.milestones.splice(this.milestones.findIndex((milestone) => milestone.id === year) + 1, 0, {
            id: nextYear.toString(),
            children: []
        });
        
        // Return new id
        return nextYear.toString();
    }
    
    addChildToPath(path, child, index) {
        const identifier = path.pop();
        child.children = child.children || [];
        
        if (path.length === 0) {
            this.milestones.find(milestone => milestone.id === identifier).children.splice(index, 0, child);
            return;
        }
        
        const milestoneId = path.shift();
        let parent = this.milestones.find(milestone => milestone.id === milestoneId);
        
        while (path.length > 0) {
            const id = path.shift();
            parent = parent.children.find(element => element.id === id);
        }
        
        parent = parent.children.find(element => element.id === identifier);
        
        parent.children.splice(index, 0, child);
    }
    
    getByPath(path) {
        
        if (path.length === 0)
            return null;
        
        const identifier = path.pop();
        
        if (path.length === 0) {
            return this.milestones.find(milestone => milestone.id === identifier);
        }
        
        const milestoneId = path.shift();
        
        let node = this.milestones.find(milestone => milestone.id === milestoneId);
        
        while (path.length > 0) {
            const id = path.shift();
            node = node.children.find(element => element.id === id);
        }
        
        return node.children.find(element => element.id === identifier);
    }
    
    setValueByPath(path, value) {
        const identifier = path.pop();
        
        if (path.length === 0)
            return;
        
        const milestoneId = path.shift();
        
        let node = this.milestones.find(milestone => milestone.id === milestoneId);
        
        while (path.length > 0) {
            const id = path.shift();
            node = node.children.find(element => element.id === id);
        }
        
        node = node.children.find(element => element.id === identifier);
        Object.assign(node, value);
    }
    
    removeByPath(path) {
        
        const identifier = path.pop();
        
        if (path.length === 0) {
            this.milestones = this.milestones.filter(milestone => milestone.id !== identifier);
            return;
        }
        
        const milestoneId = path.shift();
        
        let parent = this.milestones.find(milestone => milestone.id === milestoneId);
        
        while (path.length > 0) {
            const id = path.shift();
            parent = parent.children.find(element => element.id === id);
        }
        
        parent.children = parent.children.filter(element => element.id !== identifier);
    }
    
    moveChildByPath(oldPath, newPath, index) {
        const child = this.getByPath(util.clone(oldPath));
        
        if (!child)
            return;
        
        this.removeByPath(oldPath);
        this.addChildToPath(newPath, child, index);
    }
    
    toGraphShapes(nodesToTraverse = this.milestones, parentId = null, depth = 0) {
        
        const cells = [];
        
        nodesToTraverse.forEach((currentNode) => {
            
            const { id, children } = currentNode;
            const node = this.resolveShapeTypeFromDepth(currentNode, depth);
            
            cells.push(node);
            
            if (parentId) {
                cells.push(makeLink(parentId, id));
            }
            
            if (children) {
                cells.push(...this.toGraphShapes(children, id, depth + 1));
            }
        });
        
        return cells;
    }
    
    resolveShapeTypeFromDepth(node, depth) {
        const { id, label, date, direction } = node;
        
        switch (depth) {
            case 0:
                return Milestone.create(id);
            case 1:
                return Category.create(id, label, direction);
            default:
                return Event.create(id, date, label, direction);
        }
    }
}

export const artificialIntelligenceTimeline = new Timeline(artificialIntelligenceTimelineData);
