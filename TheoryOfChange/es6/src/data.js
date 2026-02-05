
export const theoryOfChange = {
    id: 'undg-toc-inequalities',
    solutions: [
        {
            id: 'protection',
            description: 'Improve Social Protection Coverage for Vulnerable Groups',
            evidence: 'Expanding social protection systems to include marginalized populations helps reduce poverty and inequality.',
            components: [
                {
                    id: 'coverage',
                    description: 'Enhance Universal Social Protection Programs',
                    products: [
                        {
                            id: 'policy',
                            code: 'P1',
                            description: 'National policy framework for social protection targeting marginalized populations'
                        },
                        {
                            id: 'transfers',
                            code: 'P2',
                            description: 'Cash transfer schemes to support women-headed households'
                        }
                    ]
                }
            ]
        },
        {
            id: 'justice',
            description: 'Expand Access to Justice for Discriminated Groups',
            evidence: 'Providing access to legal aid and reforming laws that discriminate against marginalized populations reduces exclusion and promotes equity.',
            components: [
                {
                    id: 'aid',
                    description: 'Strengthen Legal Aid and Support Services',
                    products: [
                        {
                            id: 'clinics',
                            code: 'P3',
                            description: 'Legal aid clinics for marginalized communities'
                        },
                        {
                            id: 'awareness',
                            code: 'P4',
                            description: 'Awareness campaigns about legal rights for vulnerable groups'
                        }
                    ]
                }
            ]
        }
    ],
    determinants: [
        {
            id: 'economy',
            description: 'Limited Economic Opportunities for Vulnerable Populations',
            evidence: 'Lack of access to decent work and economic resources traps marginalized populations in cycles of poverty and exclusion.',
            specificDevelopmentObjectives: [
                {
                    id: 'opportunities',
                    description: 'Enhance economic opportunities for vulnerable populations',
                    impactIndicators: [
                        {
                            id: 'employment',
                            code: 'I3',
                            description: 'Increase in employment rates among marginalized groups'
                        },
                        {
                            id: 'microfinance',
                            code: 'I4',
                            description: 'Increase in access to microfinance programs'
                        }
                    ]
                }
            ]
        },
        {
            id: 'discrimination',
            description: 'Structural Discrimination and Systemic Inequalities',
            evidence: 'Discriminatory laws and societal norms prevent marginalized groups from accessing essential services and opportunities.',
            specificDevelopmentObjectives: [
                {
                    id: 'laws',
                    description: 'Eliminate discriminatory laws and practices',
                    impactIndicators: [
                        {
                            id: 'reforms',
                            code: 'I1',
                            description: 'Number of discriminatory laws repealed or reformed'
                        },
                        {
                            id: 'attitudes',
                            code: 'I2',
                            description: 'Increase in positive societal attitudes toward marginalized groups'
                        }
                    ]
                }
            ]
        }
    ],
    problems: [
        {
            id: 'exclusion',
            description: 'Inequality and Exclusion in Access to Services and Opportunities',
            evidence: 'Marginalized populations continue to face barriers to accessing services, employment, and legal protection.',
            generalDevelopmentObjective: [
                {
                    id: 'inequality',
                    description: 'Reduce inequality and exclusion by ensuring equitable access to services and opportunities for all.',
                    impactIndicators: [
                        {
                            id: 'gini',
                            code: 'I5',
                            description: 'Reduction in income inequality (Gini coefficient)'
                        },
                        {
                            id: 'access',
                            code: 'I6',
                            description: 'Increase in access to essential services for marginalized groups'
                        }
                    ]
                }
            ]
        }
    ],
    assumptionLinks: [
        {
            id: 'resourcesToProtection',
            assumption: {
                id: 'resources',
                code: 'A1',
                description: 'If resources are allocated, social protection programs can be expanded.'
            },
            fromId: 'inputs',
            toId: 'protection'
        },
        {
            id: 'resourcesToJustice',
            assumption: {
                id: 'legalResources',
                code: 'A2',
                description: 'Legal aid programs will receive required inputs for implementation.'
            },
            fromId: 'inputs',
            toId: 'justice'
        },
        {
            id: 'resourcesToTransfers',
            assumption: {
                id: 'cashResources',
                code: 'A3',
                description: 'Inputs for cash transfer programs will enable rapid deployment.'
            },
            fromId: 'inputs',
            toId: 'transfers'
        },
        {
            id: 'protectionToEconomy',
            assumption: {
                id: 'protectionHelpsEconomy',
                code: 'A4',
                description: 'Improved social protection will help address structural inequalities.'
            },
            fromId: 'protection',
            toId: 'economy'
        },
        {
            id: 'transfersToDiscrimination',
            assumption: {
                id: 'cashImprovesEquality',
                code: 'A5',
                description: 'Cash transfer schemes will improve economic inclusion for vulnerable populations.'
            },
            fromId: 'transfers',
            toId: 'discrimination'
        },
        {
            id: 'justiceToDiscrimination',
            assumption: {
                id: 'justiceReducesBarriers',
                code: 'A6',
                description: 'Legal aid services will reduce legal barriers and improve access to justice for marginalized groups.'
            },
            fromId: 'justice',
            toId: 'discrimination'
        },
        {
            id: 'awarenessToAttitudes',
            assumption: {
                id: 'campaignsChangeAttitudes',
                code: 'A7',
                description: 'Awareness campaigns will increase legal literacy and reduce systemic discrimination.'
            },
            fromId: 'awareness',
            toId: 'attitudes'
        },
        {
            id: 'policyToTransfers',
            assumption: {
                id: 'frameworkToTransfers',
                code: 'A8',
                description: 'The national policy framework will enable the effective implementation of cash transfer programs.'
            },
            fromId: 'policy',
            toId: 'transfers'
        },
        {
            id: 'economyToExclusion',
            assumption: {
                id: 'economyReducesExclusion',
                code: 'A9',
                description: 'Improving economic opportunities will reduce inequality and poverty.'
            },
            fromId: 'economy',
            toId: 'exclusion'
        },
        {
            id: 'discriminationToExclusion',
            assumption: {
                id: 'discriminationReducesInequality',
                code: 'A10',
                description: 'Addressing structural inequalities will reduce exclusion and inequality.'
            },
            fromId: 'discrimination',
            toId: 'exclusion'
        }
    ]
};





