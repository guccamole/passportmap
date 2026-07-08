/** SVG world map: rendering, zoom/pan, hover, click, recoloring. */
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { select, type Selection } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { Feature, Geometry } from 'geojson';
import type { AccessEntry, MapFeatureProps } from './types';
import { colorFor, needsHatch, isDark, NO_ENTITY_DARK, NO_ENTITY_LIGHT, SELECTED_FILL, SELECTED_STROKE } from './colors';

type F = Feature<Geometry, MapFeatureProps>;

export interface MapCallbacks {
  onClick(entityId: string | null, featureName: string): void;
  onHover(entityId: string | null, featureName: string | null, event?: MouseEvent): void;
  /** current fill decision for an entity — set by main.ts */
  entryFor(entityId: string | null): AccessEntry | null | 'selected';
}

export class WorldMap {
  private svg: Selection<SVGSVGElement, unknown, null, undefined>;
  private g: Selection<SVGGElement, unknown, null, undefined>;
  private defs: Selection<SVGDefsElement, unknown, null, undefined>;
  private paths!: Selection<SVGPathElement, F, SVGGElement, unknown>;
  private zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
  private patterns = new Set<string>();

  constructor(
    private container: HTMLElement,
    private features: F[],
    private cb: MapCallbacks,
  ) {
    this.svg = select(container).append('svg').attr('class', 'world');
    this.defs = this.svg.append('defs');
    this.g = this.svg.append('g');
    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on('zoom', (ev) => this.g.attr('transform', ev.transform));
    this.svg.call(this.zoomBehavior);
    this.render();
    new ResizeObserver(() => this.render()).observe(container);
  }

  private render() {
    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 520;
    this.svg.attr('viewBox', `0 0 ${w} ${h}`);
    const projection = geoNaturalEarth1().fitExtent(
      [[8, 8], [w - 8, h - 8]],
      { type: 'FeatureCollection', features: this.features } as never,
    );
    const path = geoPath(projection);

    this.g.selectAll('path').remove();
    this.paths = this.g
      .selectAll<SVGPathElement, F>('path')
      .data(this.features, (d) => d.properties.fid)
      .join('path')
      .attr('d', (d) => path(d))
      .attr('class', 'country')
      .attr('data-entity', (d) => d.properties.entity ?? '')
      .on('click', (ev: MouseEvent, d) => {
        ev.stopPropagation();
        this.cb.onClick(d.properties.entity, d.properties.name);
      })
      .on('mousemove', (ev: MouseEvent, d) => this.cb.onHover(d.properties.entity, d.properties.name, ev))
      .on('mouseleave', () => this.cb.onHover(null, null));
    this.recolor();
  }

  /** SVG diagonal hatch pattern on top of a base color (for conditional statuses). */
  private hatch(base: string): string {
    const id = `hatch-${base.replace('#', '')}`;
    if (!this.patterns.has(id)) {
      const p = this.defs.append('pattern')
        .attr('id', id).attr('width', 6).attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
      p.append('rect').attr('width', 6).attr('height', 6).attr('fill', base);
      p.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
        .attr('stroke', 'rgba(255,255,255,0.75)').attr('stroke-width', 2);
      this.patterns.add(id);
    }
    return `url(#${id})`;
  }

  recolor() {
    if (!this.paths) return;
    const noEntity = isDark() ? NO_ENTITY_DARK : NO_ENTITY_LIGHT;
    this.paths
      .attr('fill', (d) => {
        const id = d.properties.entity;
        if (!id) return noEntity;
        const entry = this.cb.entryFor(id);
        if (entry === 'selected') return SELECTED_FILL;
        const base = colorFor(entry);
        return needsHatch(entry) ? this.hatch(base) : base;
      })
      .attr('stroke', (d) => (this.cb.entryFor(d.properties.entity) === 'selected' ? SELECTED_STROKE : null))
      .attr('stroke-width', (d) => (this.cb.entryFor(d.properties.entity) === 'selected' ? 1.4 : 0.4))
      .classed('selected', (d) => this.cb.entryFor(d.properties.entity) === 'selected');
    // draw selected features above their neighbours so the gold outline is unbroken
    this.paths.filter((d) => this.cb.entryFor(d.properties.entity) === 'selected').raise();
  }

  resetZoom() {
    this.svg.call(this.zoomBehavior.transform, zoomIdentity);
  }
}
