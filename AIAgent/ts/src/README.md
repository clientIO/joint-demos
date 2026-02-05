# JointJS+ AI Agent Application Structure

This document outlines the structure of the application and describes the purpose of each directory. It serves as a reference to help developers understand how the project is organized and where specific responsibilities are located.

## Actions

Reusable functions that perform specific actions within the application,
such as opening a dialog or running a flow.

The same action can be triggered from multiple places - for example, a user may start a flow from the toolbar or by using a keyboard shortcut.

## Configs

Configuration files for the application as a whole, as well as for individual JointJS components.

## Controllers

Application logic and event-driven behavior.
Controllers define how the application responds to events such as data changes or user interactions.

These methods should be kept simple and readable so the flow of logic is easy to understand at a glance.

## Diagram

Definitions for diagram components, such as nodes, edges, their views, tools, and layout.

## Features

Standalone functions and classes that are not specific to this application.
They are designed to be reusable across the JointJS ecosystem and have no external dependencies outside this folder.

## Registry

Functions and definitions related to providers and the operations they expose.

## System

The core, framework-level foundation of the application.

Advanced functionality — do not modify unless you fully understand the implications.

Note: This layer may eventually be extracted into a separate package.
