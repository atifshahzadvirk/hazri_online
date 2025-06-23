import React from 'react';
import OrgChart from 'react-org-chart';
import 'react-org-chart/index.css';

const orgData = {
    name: 'NMA',
    children: [
        {
            name: 'Muntazim',
            children: [
                { name: 'Naib Muntazim', children: [] },
                { name: 'Muawin', children: [] }
            ]
        }
    ]
};

const OrgChartComponent = () => {
    return <OrgChart tree={orgData} />;
};

export default OrgChartComponent;