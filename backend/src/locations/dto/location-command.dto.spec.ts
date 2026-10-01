import { CreateLocationDto } from './create-location.dto';
import { UpdateLocationDto } from './update-location.dto';

describe('location DTO command conversion', () => {
  it('trims create fields and preserves omitted optionals', () => {
    const dto = Object.assign(new CreateLocationDto(), { name: '  Shelter  ', description: '  Main  ', ownerId: ' user-1 ' });
    expect(dto.toCommand()).toEqual({ name: 'Shelter', description: 'Main', ownerId: 'user-1' });
    expect(Object.assign(new CreateLocationDto(), { name: 'Shelter' }).toCommand()).toEqual({ name: 'Shelter' });
  });

  it('normalizes provided update values and preserves explicitly cleared nullable values', () => {
    const dto = Object.assign(new UpdateLocationDto(), { name: '  New  ', description: '  ', ownerId: ' ', status: 'INACTIVE' });
    expect(dto.toCommand()).toEqual({ name: 'New', description: null, ownerId: null, status: 'INACTIVE' });
    expect(new UpdateLocationDto().toCommand()).toEqual({});
  });
});
