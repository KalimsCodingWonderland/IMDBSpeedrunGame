import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function GraphVisualizer() {
    const svgRef = useRef();

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous content

        const width = 800;
        const height = 600;

        svg.attr('width', width).attr('height', height);

        const nodes = [
            { id: 'Movie 1' },
            { id: 'Movie 2' },
            { id: 'Movie 3' },
        ];

        const links = [
            { source: 'Movie 1', target: 'Movie 2' },
            { source: 'Movie 2', target: 'Movie 3' },
        ];

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));

        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', '#aaa');

        const node = svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 10)
            .attr('fill', '#69b3a2');

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });
    }, []);

    return <svg ref={svgRef}></svg>;
}

export default GraphVisualizer;