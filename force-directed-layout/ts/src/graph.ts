export default {
    cells: [
        {
            id: 1,
            type: 'erd.Entity',
            position: { x: 400, y: 350 },
            attrs: {
                label: {
                    text: 'Subject'
                }
            }
        },
        {
            id: 2,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'manage'
                }
            }
        },
        {
            id: 3,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'teach'
                }
            }
        },
        {
            id: 4,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'take'
                }
            }
        },
        {
            id: 5,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'setup'
                }
            }
        },
        {
            id: 6,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectId'
                }
            }
        },
        {
            id: 7,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectName'
                }
            }
        },
        {
            id: 8,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'className'
                }
            }
        },
        {
            id: 9,
            type: 'erd.Entity',
            position: { x: 400, y: 650 },
            attrs: {
                label: {
                    text: 'Admin'
                }
            }
        },
        {
            id: 10,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'userId'
                }
            }
        },
        {
            id: 11,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'name'
                }
            }
        },
        {
            id: 12,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'email'
                }
            }
        },
        {
            id: 13,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'password'
                }
            }
        },
        {
            id: 14,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectId'
                }
            }
        },
        {
            id: 15,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'classId'
                }
            }
        },
        {
            id: 16,
            type: 'erd.Entity',
            position: { x: 700, y: 450 },
            attrs: {
                label: {
                    text: 'Volunteers'
                }
            }
        },
        {
            id: 17,
            type: 'erd.Entity',
            position: { x: 400, y: 50 },
            attrs: {
                label: {
                    text: 'Student'
                }
            }
        },
        {
            id: 18,
            type: 'erd.Entity',
            position: { x: 100, y: 450 },
            attrs: {
                label: {
                    text: 'Management'
                }
            }
        },
        {
            id: 19,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'monitor'
                }
            }
        },
        {
            id: 20,
            type: 'erd.Relationship',
            attrs: {
                label: {
                    text: 'assess'
                }
            }
        },
        {
            id: 21,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'userId'
                }
            }
        },
        {
            id: 22,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectId'
                }
            }
        },
        {
            id: 23,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'classId'
                }
            }
        },
        {
            id: 24,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'name'
                }
            }
        },
        {
            id: 25,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'score'
                }
            }
        },
        {
            id: 26,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'classMonitoring'
                }
            }
        },
        {
            id: 27,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'studentId'
                }
            }
        },
        {
            id: 28,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'name'
                }
            }
        },
        {
            id: 29,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'className'
                }
            }
        },
        {
            id: 30,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'score'
                }
            }
        },
        {
            id: 31,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectName'
                }
            }
        },
        {
            id: 32,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'userId'
                }
            }
        },
        {
            id: 33,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'name'
                }
            }
        },
        {
            id: 34,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'subjectId'
                }
            }
        },
        {
            id: 35,
            type: 'erd.Attribute',
            attrs: {
                label: {
                    text: 'materialType'
                }
            }
        },
        //---------------------------
        // Links
        //---------------------------
        {
            type: 'erd.Connection',
            source: {
                id: 18
            },
            target: {
                id: 35
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 18
            },
            target: {
                id: 34
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 18
            },
            target: {
                id: 33
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 18
            },
            target: {
                id: 32
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 31
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 30
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 29
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 28
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 27
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 26
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 25
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 24
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 23
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 22
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 16
            },
            target: {
                id: 21
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 4
            },
            target: {
                id: 17
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 5
            },
            target: {
                id: 18
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 5
            },
            target: {
                id: 16
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 18
            },
            target: {
                id: 19
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 19
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 17
            },
            target: {
                id: 20
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 20
            },
            target: {
                id: 16
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 3
            },
            target: {
                id: 16
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 2
            },
            target: {
                id: 18
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 10
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 11
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 12
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 13
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 14
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 9
            },
            target: {
                id: 15
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 5
            },
            target: {
                id: 9
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 2
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 2
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 6
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 7
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 8
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 3
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 4
            }
        },
        {
            type: 'erd.Connection',
            source: {
                id: 1
            },
            target: {
                id: 5
            }
        }
    ]
}
