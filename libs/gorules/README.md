# @org/gorules

A reusable NestJS library for integrating GoRules business rules engine into Nx workspace applications.

## Overview

This library provides a clean abstraction layer for GoRules functionality, following NestJS architectural patterns and best practices. It enables seamless integration of business rules execution into your NestJS applications.

## Features

- 🚀 **NestJS Integration** - Full dependency injection support
- 🔒 **Type Safety** - Complete TypeScript definitions
- 🔄 **Retry Logic** - Automatic retry with exponential backoff
- 📊 **Monitoring** - Built-in logging and performance metrics
- 🎯 **Batch Processing** - Execute multiple rules simultaneously
- ⚡ **Error Handling** - Comprehensive error handling and recovery

## Installation

This library is part of the Nx workspace and can be imported directly:

```typescript
import { GoRulesModule, GoRulesService } from '@org/gorules';
```

## Quick Start

1. **Configure the module** in your NestJS application:

```typescript
import { Module } from '@nestjs/common';
import { GoRulesModule } from '@org/gorules';

@Module({
  imports: [
    GoRulesModule.forRoot({
      apiUrl: 'https://triveni.gorules.io',
      apiKey: process.env.GORULES_API_KEY,
      projectId: process.env.GORULES_PROJECT_ID,
    }),
  ],
})
export class AppModule {}
```

2. **Use the service** in your controllers or services:

```typescript
import { Injectable } from '@nestjs/common';
import { GoRulesService } from '@org/gorules';

@Injectable()
export class BusinessLogicService {
  constructor(private readonly goRulesService: GoRulesService) {}

  async processDecision(input: any) {
    const result = await this.goRulesService.executeRule('rule-id', input);
    return result.result;
  }
}
```

## Development

### Building the library

Run `nx build gorules` to build the library.

### Running unit tests

Run `nx test gorules` to execute the unit tests via [Jest](https://jestjs.io).

## Documentation

For detailed documentation, examples, and API reference, see the [full documentation](./docs/README.md).
