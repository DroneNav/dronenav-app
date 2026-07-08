![DroneNAV]("https://avatars.githubusercontent.com/u/287328252?s=400&u=42c97657ee8df9c220c0bf0d1cf7a0fe811c1fff&v=4")

---

# DroneNav React Front End

## Overview

The DroneNav React front end is the interactive GIS application for the DroneNav platform. Its primary responsibility is to provide a map-based interface for creating, viewing, and managing the spatial objects that define DroneNav-controlled airspace.

The React front end is not the system of record. It is a spatial user interface that communicates with the DroneNav API, which owns the authoritative overlay data, geometry, workflow state, and operational metadata.

## Purpose

The React front end exists to support the spatial parts of DroneNav that are difficult or impractical to manage through traditional forms alone.

It provides tools for working with:

* Sites
* Zones
* DronePorts
* Routes
* Route segment attributes
* Survey context views
* Site package views

The application gives users a geographic understanding of DroneNav infrastructure and allows them to create and inspect overlays in their real-world spatial context.

## Architectural Role

DroneNav separates responsibilities across three major platform layers:

* **React Front End** — interactive GIS and spatial editing
* **Flask API** — business API and authoritative spatial data access
* **Drupal Governance Interface** — governance workflows, surveys, reviews, approvals, and operational readiness

The React front end is responsible for visual and spatial interaction. It does not own governance decisions, review state, or long-term workflow history. Those responsibilities belong to the governance and API layers.

## Core Responsibilities

The React front end is responsible for:

* Rendering DroneNav overlays on a map
* Creating new spatial overlays
* Editing overlay metadata where appropriate
* Displaying existing site packages
* Displaying survey context views
* Displaying route context across one or more sites
* Capturing route segment operational attributes
* Presenting overlay status visually
* Supporting read-only and editor modes
* Providing a reusable GIS component for both standalone and embedded use cases

## Overlay Model

The application works with several core DroneNav overlay types.

### Site

A Site represents a managed geographic area. Sites are polygon-based and provide the parent context for many dependent overlays.

### Zone

A Zone represents an inclusion, exclusion, restriction, or other governed area within a Site. Zones are polygon-based and are visually layered within the Site boundary.

### DronePort

A DronePort represents a defined takeoff, landing, or operating point. DronePorts are point-based and rendered with a diameter to represent their operational footprint.

### Route

A Route represents a governed flight corridor between DronePorts. Routes are line-based and may be one-way, reverse, or bidirectional.

Routes also contain segment attributes. The geometry defines the route path, while segment attributes define operational constraints for each leg of the route, such as width, altitude limits, and speed limits.

## Route Segment Attributes

Route segment attributes are an important bridge between Phase 1 governance and future flight controller integration.

A route with `N` points has `N - 1` route segments. Segment attributes are stored in order, where:

```text
segment_attributes[i] applies to geometry.coordinates[i] -> geometry.coordinates[i + 1]
```

The React front end supports creating and editing these attributes while preserving the rule that route geometry is immutable once established.

Segment attributes currently include:

* Route width
* Minimum altitude
* Maximum altitude
* Speed limit

The first segment is treated as the departure segment. The final segment is treated as the approach segment. Intermediate segments represent the cruise or transition legs of the route.

## Operating Modes

The React front end supports multiple operating modes so the same GIS component can be reused in different platform contexts.

### Editor Mode

Editor mode allows users to create and modify DroneNav overlays. It supports map-based drawing and metadata entry for Sites, Zones, DronePorts, and Routes.

### View Mode

View mode allows users to inspect existing overlays and view their metadata.

### Survey Read-Only Mode

Survey read-only mode supports governance workflows by displaying a selected overlay in its surrounding spatial context. It is used when a survey or review process needs to show the target overlay and related overlays without allowing map edits.

### Site Summary Read-Only Mode

Site summary read-only mode displays an entire Site and all dependent overlays without emphasis or de-emphasis. It supports Site Survey Summary and package-level review scenarios.

### Site Read-Only Mode

Site read-only mode provides a general-purpose read-only view of a Site package.

## Design Principles

### The Map Is a Spatial Tool, Not the Governance System

The React front end helps users understand and manage spatial data. It does not make governance decisions. Survey submission, review, approval, and operational eligibility are handled by the governance workflow.

### The API Is the Source of Truth

The front end fetches and submits data through the DroneNav API. Overlay state, geometry, survey status, operational status, and route metadata are owned by the API and database layers.

### Geometry and Metadata Are Different Concerns

DroneNav treats geometry as a governed artifact. Once an overlay geometry is approved, changing that geometry should generally result in a new overlay or route rather than silently modifying the existing one.

Operational metadata may evolve over time. This is especially important for routes, where segment-level attributes may change without changing the approved route path.

### Reusable GIS Component

The map interface is designed to be reusable across contexts. It can support standalone operation as well as embedded governance workflows.

This allows the same spatial rendering and editing behavior to support multiple parts of the DroneNav platform.

### Visual State Should Reflect Operational State

The React front end is responsible for representing overlay status visually. Over time, styling rules can evolve to reflect operational status, survey status, review status, selected overlays, conflicts, telemetry status, or other state-driven conditions.

## Relationship to Governance Workflows

The React front end supports governance workflows but does not replace them.

Drupal-based governance workflows use the React map to provide spatial context for:

* Survey work
* Survey summaries
* Overlay review
* Site package review
* Operational readiness decisions

This separation allows Drupal to manage workflow, permissions, and audit history while React manages the interactive GIS experience.

## Relationship to Future Phases

The React front end establishes the spatial foundation for future DroneNav phases.

In Phase 1, it supports governance and overlay creation.

In later phases, the same GIS foundation can support:

* Flight controller integration
* Flight plan preview
* Route segment constraint visualization
* Live telemetry
* Traffic management
* Conflict detection
* Emergency rerouting
* AI route optimization
* Fleet operations visualization

This makes the React front end a long-term visualization layer for DroneNav, not just a Phase 1 editing tool.

## Summary

The DroneNav React front end provides the interactive GIS layer for the platform. It enables spatial creation, visualization, and inspection of DroneNav infrastructure while preserving a clean separation from governance workflows and authoritative data ownership.

Its purpose is to make DroneNav spatially understandable and operationally usable, while allowing the API and governance layers to remain responsible for persistence, workflow, review, approval, and system authority.
