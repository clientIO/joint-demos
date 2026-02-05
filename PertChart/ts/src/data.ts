const data = {
    'success': true,
    'tasks': {
        'rows': [
            {
                'id': 1000,
                'name': 'Launch Sass Product',
                'percentDone': 100,
                'duration': 5,
                'startDate': '2025-09-11',
                'expanded': true,
                'children': [
                    {
                        'id': 1,
                        'name': 'Project Kickoff Meeting',
                        'percentDone': 100,
                        'duration': 1,
                        'startDate': '2025-09-11'
                    },
                    {
                        'id': 2,
                        'name': 'Requirements Gathering',
                        'percentDone': 80,
                        'duration': 4,
                        'startDate': '2025-09-12'
                    },
                    {
                        'id': 3,
                        'name': 'Market Research',
                        'percentDone': 60,
                        'duration': 5,
                        'startDate': '2025-09-12'
                    },
                    {
                        'id': 4,
                        'name': 'UI/UX Design Phase',
                        'percentDone': 50,
                        'duration': 7,
                        'startDate': '2025-09-17'
                    },
                    {
                        'id': 5,
                        'name': 'Backend Architecture Design',
                        'percentDone': 30,
                        'duration': 5,
                        'startDate': '2025-09-17'
                    },
                    {
                        'id': 6,
                        'name': 'Frontend Development (Initial)',
                        'percentDone': 25,
                        'duration': 15,
                        'startDate': '2025-09-24'
                    },
                    {
                        'id': 7,
                        'name': 'Backend Development',
                        'percentDone': 10,
                        'duration': 19,
                        'startDate': '2025-09-22'
                    },
                    {
                        'id': 8,
                        'name': 'Integration of Frontend and Backend',
                        'percentDone': 5,
                        'duration': 6,
                        'startDate': '2025-10-10'
                    },
                    {
                        'id': 9,
                        'name': 'User Testing Preparation',
                        'percentDone': 0,
                        'duration': 2,
                        'startDate': '2025-10-16'
                    },
                    {
                        'id': 10,
                        'name': 'Conduct User Testing',
                        'percentDone': 0,
                        'duration': 5,
                        'startDate': '2025-10-18'
                    },
                    {
                        'id': 11,
                        'name': 'Analyze User Feedback',
                        'percentDone': 0,
                        'duration': 2,
                        'startDate': '2025-10-23'
                    },
                    {
                        'id': 12,
                        'name': 'Revise Design and Fix bugs',
                        'percentDone': 0,
                        'duration': 6,
                        'startDate': '2025-10-25'
                    },
                    {
                        'id': 13,
                        'name': 'Final Testing',
                        'percentDone': 0,
                        'duration': 4,
                        'startDate': '2025-10-31'
                    },
                    {
                        'id': 14,
                        'name': 'Prepare Marketing PLan',
                        'percentDone': 0,
                        'duration': 9,
                        'startDate': '2025-10-20'
                    },
                    {
                        'id': 15,
                        'name': 'Create Promotional Content',
                        'percentDone': 0,
                        'duration': 8,
                        'startDate': '2025-10-29'
                    },
                    {
                        'id': 16,
                        'name': 'Plan Product Launch Event',
                        'percentDone': 0,
                        'duration': 13,
                        'startDate': '2025-10-20'
                    },
                    {
                        'id': 17,
                        'name': 'Finalize App Store Listings',
                        'percentDone': 0,
                        'duration': 3,
                        'startDate': '2025-11-04'
                    },
                    {
                        'id': 18,
                        'name': 'Deploy Application',
                        'percentDone': 0,
                        'duration': 1,
                        'startDate': '2025-11-07'
                    },
                    {
                        'id': 19,
                        'name': 'Execute Marketing Campaign',
                        'percentDone': 0,
                        'duration': 8,
                        'startDate': '2025-11-08'
                    },
                    {
                        'id': 20,
                        'name': 'Launch Product',
                        'percentDone': 0,
                        'duration': 1,
                        'startDate': '2025-11-16'
                    }
                ]
            }
        ]
    },
    'dependencies': {
        'rows': [
            {
                'id': 1,
                'fromTask': 1,
                'toTask': 2
            },
            {
                'id': 2,
                'fromTask': 1,
                'toTask': 3
            },
            {
                'id': 3,
                'fromTask': 2,
                'toTask': 4
            },
            {
                'id': 4,
                'fromTask': 3,
                'toTask': 4
            },
            {
                'id': 5,
                'fromTask': 2,
                'toTask': 5
            },
            {
                'id': 6,
                'fromTask': 3,
                'toTask': 5
            },
            {
                'id': 7,
                'fromTask': 4,
                'toTask': 6
            },
            {
                'id': 8,
                'fromTask': 5,
                'toTask': 7
            },
            {
                'id': 9,
                'fromTask': 6,
                'toTask': 8
            },
            {
                'id': 10,
                'fromTask': 7,
                'toTask': 8
            },
            {
                'id': 11,
                'fromTask': 8,
                'toTask': 9
            },
            {
                'id': 12,
                'fromTask': 9,
                'toTask': 10
            },
            {
                'id': 13,
                'fromTask': 10,
                'toTask': 11
            },
            {
                'id': 14,
                'fromTask': 11,
                'toTask': 12
            },
            {
                'id': 15,
                'fromTask': 12,
                'toTask': 13
            },
            {
                'id': 16,
                'fromTask': 1,
                'toTask': 14
            },
            {
                'id': 17,
                'fromTask': 14,
                'toTask': 15
            },
            {
                'id': 18,
                'fromTask': 1,
                'toTask': 16
            },
            {
                'id': 19,
                'fromTask': 13,
                'toTask': 17
            },
            {
                'id': 20,
                'fromTask': 15,
                'toTask': 17
            },
            {
                'id': 21,
                'fromTask': 17,
                'toTask': 18
            },
            {
                'id': 22,
                'fromTask': 15,
                'toTask': 19
            },
            {
                'id': 23,
                'fromTask': 16,
                'toTask': 20
            },
            {
                'id': 24,
                'fromTask': 18,
                'toTask': 20
            },
            {
                'id': 25,
                'fromTask': 19,
                'toTask': 20
            }
        ]
    },
    'resources': {
        'rows': [
            {
                'id': 1,
                'name': 'Celia',
                'city': 'Barcelona'
            },
            {
                'id': 2,
                'name': 'Lee',
                'city': 'London'
            },
            {
                'id': 3,
                'name': 'Macy',
                'city': 'New York'
            },
            {
                'id': 4,
                'name': 'Anna',
                'city': 'Prague'
            },
            {
                'id': 5,
                'name': 'Rob',
                'city': 'Rome'
            },
            {
                'id': 6,
                'name': 'Dave',
                'city': 'Barcelona'
            },
            {
                'id': 7,
                'name': 'Dan',
                'city': 'London'
            },
            {
                'id': 8,
                'name': 'George',
                'city': 'New York'
            },
            {
                'id': 9,
                'name': 'Gloria',
                'city': 'Rome'
            },
            {
                'id': 10,
                'name': 'Henrik',
                'city': 'London'
            }
        ]
    },
    'assignments': {
        'rows': [
            {
                'id': 1,
                'event': 1,
                'resource': 1
            },
            {
                'id': 2,
                'event': 2,
                'resource': 2
            },
            {
                'id': 3,
                'event': 3,
                'resource': 3
            },
            {
                'id': 4,
                'event': 4,
                'resource': 4
            },
            {
                'id': 5,
                'event': 4,
                'resource': 5
            },
            {
                'id': 6,
                'event': 5,
                'resource': 6
            },
            {
                'id': 7,
                'event': 6,
                'resource': 6
            },
            {
                'id': 8,
                'event': 7,
                'resource': 8
            },
            {
                'id': 9,
                'event': 8,
                'resource': 7
            },
            {
                'id': 10,
                'event': 9,
                'resource': 10
            },
            {
                'id': 11,
                'event': 11,
                'resource': 2
            },
            {
                'id': 12,
                'event': 12,
                'resource': 3
            },
            {
                'id': 13,
                'event': 13,
                'resource': 4
            },
            {
                'id': 14,
                'event': 14,
                'resource': 2
            },
            {
                'id': 15,
                'event': 15,
                'resource': 6
            },
            {
                'id': 16,
                'event': 16,
                'resource': 2
            },
            {
                'id': 17,
                'event': 17,
                'resource': 3
            },
            {
                'id': 18,
                'event': 18,
                'resource': 5
            },
            {
                'id': 19,
                'event': 19,
                'resource': 7
            },
            {
                'id': 20,
                'event': 20,
                'resource': 3
            },
            {
                'id': 21,
                'event': 5,
                'resource': 8
            },
            {
                'id': 22,
                'event': 6,
                'resource': 9
            },
            {
                'id': 23,
                'event': 7,
                'resource': 2
            },
            {
                'id': 24,
                'event': 8,
                'resource': 5
            },
            {
                'id': 25,
                'event': 9,
                'resource': 1
            }
        ]
    }
};

export default data;
