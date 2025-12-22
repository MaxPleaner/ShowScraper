import React from 'react';

const RegionBlock = ({ region, showTitle, children }) => (
  <div className="Region">
    { showTitle ? <p className="region-title">{region}</p> : "" }
    {children}
  </div>
);

export default RegionBlock;
