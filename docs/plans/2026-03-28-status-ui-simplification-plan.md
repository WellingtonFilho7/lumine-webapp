# Status UI Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify visible enrollment statuses in the children UI to the operational set actually used by the NGO while preserving support for legacy statuses already stored.

**Architecture:** Centralize visible status options in `src/constants/enrollment.js`, reuse them in list filters and status change selectors, and preserve any legacy current status in the detail selector so old records remain manageable.

**Tech Stack:** React, Vitest, Testing Library, Tailwind CSS.
