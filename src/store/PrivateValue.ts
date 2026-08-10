import { bind } from './bind';

export class PrivateValue<T> {
  private value: T;

  constructor(value: T) {
    this.value = value;
  }

  setValue(value: T) {
    this.value = value;
  }

  @bind
  getValue() {
    return this.value;
  }
}
