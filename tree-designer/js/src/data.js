
export default {
    id: 'prf1',
    label: 'Physical Router\n& Firewall',
    type: 'device',
    connectionDirection: 'bidirectional',
    connectionStyle: 'solid',
    children: [{
            id: 'ps1',
            label: 'Physical Switch',
            connections: 'serial',
            connectionDirection: 'bidirectional',
            type: 'device',
            boundary: true,
            children: [{
                    id: 'l1',
                    hidden: true,
                    type: 'line',
                    boundary: true,
                    boundaryLabel: 'Compute Node 1',
                    connections: 'serial',
                    connectionStyle: 'solid',
                    connectionDirection: 'bidirectional',
                    children: [{
                            id: 'v1',
                            label: 'Virtual Switch',
                            type: 'virtual',
                            connections: 'parallel',
                            connectionStyle: 'dashed',
                            children: [{
                                    id: 'vm1',
                                    label: 'VM1',
                                    type: 'computer',
                                }, {
                                    id: 'vm2',
                                    label: 'VM2',
                                    type: 'computer',
                                }, {
                                    id: 'vm3',
                                    label: 'VM3',
                                    type: 'computer',
                                }]
                        }, {
                            id: 'vrf1',
                            label: 'Virtual Router\n& Firewall',
                            type: 'router',
                            size: 70,
                        }]
                }, {
                    id: 'l2',
                    hidden: true,
                    type: 'line',
                    boundary: true,
                    boundaryLabel: 'Compute Node 2',
                    connections: 'serial',
                    connectionStyle: 'solid',
                    connectionDirection: 'bidirectional',
                    children: [{
                            id: 'v2',
                            label: 'Virtual Switch',
                            type: 'virtual',
                            connections: 'parallel',
                            connectionStyle: 'dashed',
                            children: [{
                                    id: 'vm4',
                                    label: 'VM4',
                                    type: 'computer',
                                }, {
                                    id: 'vm5',
                                    label: 'VM5',
                                    type: 'computer',
                                }, {
                                    id: 'vm6',
                                    label: 'VM6',
                                    type: 'computer',
                                }]
                        }, {
                            id: 'vrf2',
                            label: 'Virtual Router\n& Firewall',
                            type: 'router',
                            size: 70,
                        }]
                }]
        }]
};
